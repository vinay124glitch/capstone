"""
Movement detection from MPU6050 and FSR change rate.
Uses rolling buffers and configurable thresholds.
"""
from __future__ import annotations
import numpy as np
import time
from collections import deque
from typing import List, Deque, Optional

from app.schemas.schemas import MovementMetrics


class MovementDetector:
    """
    Maintains rolling history of accelerometer, gyroscope, and FSR data.
    Detects movement level and discrete movement events.
    """

    BUFFER_SIZE = 30  # ~30 seconds at 1 Hz

    def __init__(
        self,
        still_threshold: float = 0.05,
        low_threshold: float = 0.15,
        moderate_threshold: float = 0.35,
        event_cooldown: float = 5.0,  # seconds between events
    ):
        self.still_threshold = still_threshold
        self.low_threshold = low_threshold
        self.moderate_threshold = moderate_threshold
        self.event_cooldown = event_cooldown

        self._accel_buf: Deque[List[float]] = deque(maxlen=self.BUFFER_SIZE)
        self._gyro_buf: Deque[List[float]] = deque(maxlen=self.BUFFER_SIZE)
        self._fsr_buf: Deque[List[float]] = deque(maxlen=self.BUFFER_SIZE)
        self._last_event_time: float = 0.0
        self.event_count: int = 0

    def update_thresholds(self, still: float, low: float, moderate: float):
        self.still_threshold = still
        self.low_threshold = low
        self.moderate_threshold = moderate

    def process(self, accel: List[float], gyro: List[float], fsr: List[float]) -> MovementMetrics:
        self._accel_buf.append(accel)
        self._gyro_buf.append(gyro)
        self._fsr_buf.append(fsr)

        accel_arr = np.array(list(self._accel_buf))
        gyro_arr = np.array(list(self._gyro_buf))
        fsr_arr = np.array(list(self._fsr_buf))

        # Gravity-removed accelerometer magnitude (subtract mean z ≈ 1g)
        gravity = np.mean(accel_arr, axis=0)
        accel_no_gravity = accel_arr - gravity
        accel_mags = np.linalg.norm(accel_no_gravity, axis=1)
        accel_mag = float(accel_mags[-1]) if len(accel_mags) > 0 else 0.0
        accel_var = float(np.var(accel_mags)) if len(accel_mags) > 1 else 0.0

        gyro_mags = np.linalg.norm(gyro_arr, axis=1)
        gyro_mag = float(gyro_mags[-1]) if len(gyro_mags) > 0 else 0.0
        gyro_var = float(np.var(gyro_mags)) if len(gyro_mags) > 1 else 0.0

        # FSR change rate (mean absolute change per sensor)
        if len(fsr_arr) >= 2:
            fsr_diff = np.abs(np.diff(fsr_arr, axis=0))
            fsr_change_rate = float(np.mean(fsr_diff[-1]) / 4095.0)
        else:
            fsr_change_rate = 0.0

        # Combined motion score
        motion_score = float(
            0.4 * accel_var + 0.3 * gyro_var + 0.3 * fsr_change_rate
        )

        # Classify level
        if motion_score < self.still_threshold:
            level = "Still"
        elif motion_score < self.low_threshold:
            level = "Low"
        elif motion_score < self.moderate_threshold:
            level = "Moderate"
        else:
            level = "High"

        # Detect discrete event (debounce)
        now = time.time()
        is_event = False
        if level in ("Moderate", "High") and (now - self._last_event_time) > self.event_cooldown:
            is_event = True
            self._last_event_time = now
            self.event_count += 1

        return MovementMetrics(
            accel_magnitude=accel_mag,
            accel_variance=accel_var,
            gyro_magnitude=gyro_mag,
            gyro_variance=gyro_var,
            fsr_change_rate=fsr_change_rate,
            level=level,
            is_event=is_event,
        )

    def reset(self):
        self._accel_buf.clear()
        self._gyro_buf.clear()
        self._fsr_buf.clear()
        self._last_event_time = 0.0
        self.event_count = 0


movement_detector = MovementDetector()
