"""
Experimental Sleep Score calculator.

Disclaimer: The weighting is a project-defined experimental heuristic
and has NOT been clinically validated. This is NOT a medical metric.
"""
from __future__ import annotations
import numpy as np
from collections import deque
from typing import Dict, Optional, Deque
from dataclasses import dataclass, field


@dataclass
class SleepScoreWeights:
    movement_stability: float = 0.30
    position_stability: float = 0.25
    pressure_stability: float = 0.25
    temperature_stability: float = 0.20
    eeg_stability: float = 0.0


class SleepScoreCalculator:
    """
    Rolling experimental sleep score (0-100).

    Components (all normalised to 0-100 first):
    - Movement Stability : low movement → higher score
    - Position Stability : few position changes → higher score
    - Pressure Stability : stable FSR → higher score
    - Temperature Stability: temperature within comfort range → higher score
    - EEG Stability (opt): good EEG signal quality → higher score
    """

    BUFFER_SIZE = 60  # 60 seconds of data

    def __init__(self, weights: Optional[SleepScoreWeights] = None,
                 temp_min: float = 18.0, temp_max: float = 26.0):
        self.weights = weights or SleepScoreWeights()
        self.temp_min = temp_min
        self.temp_max = temp_max

        # Rolling buffers
        self._movement_scores: Deque[float] = deque(maxlen=self.BUFFER_SIZE)
        self._pressure_stabilities: Deque[float] = deque(maxlen=self.BUFFER_SIZE)
        self._temp_scores: Deque[float] = deque(maxlen=self.BUFFER_SIZE)
        self._eeg_qualities: Deque[float] = deque(maxlen=self.BUFFER_SIZE)
        self._positions: Deque[str] = deque(maxlen=self.BUFFER_SIZE)

    def update_weights(self, w: SleepScoreWeights):
        self.weights = w

    def update(
        self,
        movement_level: str,
        position: str,
        pressure_stability: float,
        temp1: float,
        temp2: float,
        eeg_quality: Optional[float] = None,
    ) -> Dict[str, float]:
        # Movement stability (0-100): Still=100, Low=75, Moderate=40, High=0
        mv = {"Still": 100.0, "Low": 75.0, "Moderate": 40.0, "High": 0.0}.get(movement_level, 50.0)
        self._movement_scores.append(mv)

        # Position stability: penalise frequent changes
        self._positions.append(position)
        pos_list = list(self._positions)
        if len(pos_list) > 1:
            changes = sum(1 for i in range(1, len(pos_list)) if pos_list[i] != pos_list[i - 1])
            pos_stability = float(np.clip(100 - changes * (100 / max(len(pos_list) - 1, 1)), 0, 100))
        else:
            pos_stability = 100.0

        # Pressure stability (already 0-100)
        self._pressure_stabilities.append(float(np.clip(pressure_stability, 0, 100)))

        # Temperature comfort (linear within range, 100 if within, declining outside)
        avg_temp = (temp1 + temp2) / 2.0
        if self.temp_min <= avg_temp <= self.temp_max:
            temp_score = 100.0
        else:
            dist = min(abs(avg_temp - self.temp_min), abs(avg_temp - self.temp_max))
            temp_score = float(np.clip(100 - dist * 10, 0, 100))
        self._temp_scores.append(temp_score)

        if eeg_quality is not None:
            self._eeg_qualities.append(float(np.clip(eeg_quality, 0, 100)))

        # Compute rolling averages
        mv_avg = float(np.mean(self._movement_scores)) if self._movement_scores else 50.0
        pr_avg = float(np.mean(self._pressure_stabilities)) if self._pressure_stabilities else 50.0
        tm_avg = float(np.mean(self._temp_scores)) if self._temp_scores else 50.0
        eq_avg = float(np.mean(self._eeg_qualities)) if self._eeg_qualities else None

        # Normalise weights
        w = self.weights
        total_weight = (
            w.movement_stability + w.position_stability + w.pressure_stability
            + w.temperature_stability + (w.eeg_stability if eq_avg is not None else 0.0)
        )
        if total_weight <= 0:
            total_weight = 1.0

        score = (
            w.movement_stability * mv_avg
            + w.position_stability * pos_stability
            + w.pressure_stability * pr_avg
            + w.temperature_stability * tm_avg
        )
        if eq_avg is not None and w.eeg_stability > 0:
            score += w.eeg_stability * eq_avg

        score = float(np.clip(score / total_weight, 0, 100))

        breakdown = {
            "movement_stability": round(mv_avg, 1),
            "position_stability": round(pos_stability, 1),
            "pressure_stability": round(pr_avg, 1),
            "temperature_stability": round(tm_avg, 1),
        }
        if eq_avg is not None:
            breakdown["eeg_stability"] = round(eq_avg, 1)

        return {
            "score": round(score, 1),
            "breakdown": breakdown,
        }

    def reset(self):
        self._movement_scores.clear()
        self._pressure_stabilities.clear()
        self._temp_scores.clear()
        self._eeg_qualities.clear()
        self._positions.clear()


sleep_scorer = SleepScoreCalculator()
