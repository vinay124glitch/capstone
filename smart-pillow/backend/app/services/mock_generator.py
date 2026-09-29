"""
Mock sensor data generator.
Produces realistic simulated data without physical ESP32 hardware.
"""
from __future__ import annotations
import asyncio
import math
import random
import time
from typing import Callable, Optional, List
import numpy as np

FSR_MAX = 4095.0


class MockGenerator:
    """
    Generates realistic mock sensor packets at ~1 Hz.
    EEG samples are generated at 250 Hz and batched.
    """

    POSITIONS = ["Back", "Left", "Right"]

    def __init__(self, callback: Callable):
        self._callback = callback
        self._running = False
        self._task: Optional[asyncio.Task] = None

        # Simulation state
        self.position: str = "Back"
        self.movement_intensity: float = 0.0  # 0..1
        self.temp_delta: float = 0.0
        self.hum_delta: float = 0.0
        self.eeg_noise_level: float = 1.0   # multiplier
        self.poor_contact: bool = False
        self.interference_50hz: bool = False

        # Internal state
        self._t: float = 0.0
        self._eeg_phase: float = 0.0
        self._eeg_seq: int = 0
        self._temp_base: float = 28.5
        self._hum_base: float = 55.0
        self._last_fsr: List[float] = [2000.0] * 9
        self._movement_counter: int = 0

    # ------------------------------------------------------------------
    # Control methods
    # ------------------------------------------------------------------
    async def start(self):
        if self._running:
            return
        self._running = True
        self._task = asyncio.create_task(self._loop())

    async def stop(self):
        self._running = False
        if self._task:
            self._task.cancel()
            self._task = None

    def set_position(self, position: str):
        if position in self.POSITIONS:
            self.position = position

    def trigger_movement(self, intensity: float = 0.8, duration_s: float = 3.0):
        self.movement_intensity = intensity
        self._movement_counter = int(duration_s)

    def set_eeg_noise(self, level: float):
        self.eeg_noise_level = float(np.clip(level, 0.1, 5.0))

    def set_poor_contact(self, value: bool):
        self.poor_contact = value

    def set_50hz_interference(self, value: bool):
        self.interference_50hz = value

    def set_temp_delta(self, delta: float):
        self.temp_delta = delta

    def set_hum_delta(self, delta: float):
        self.hum_delta = delta

    # ------------------------------------------------------------------
    # FSR generation
    # ------------------------------------------------------------------
    def _generate_fsr(self) -> List[float]:
        """Generate position-dependent FSR pattern with natural variation."""
        mv = self.movement_intensity
        base_vals: np.ndarray

        if self.position == "Left":
            # Higher pressure on left columns (indices 0,3,6)
            base_vals = np.array([
                3200, 1800, 800,
                2900, 1500, 700,
                3100, 1700, 750,
            ], dtype=float)
        elif self.position == "Right":
            # Higher pressure on right columns (indices 2,5,8)
            base_vals = np.array([
                800, 1800, 3200,
                700, 1500, 2900,
                750, 1700, 3100,
            ], dtype=float)
        else:  # Back
            # Central load, more balanced
            base_vals = np.array([
                1200, 2800, 1200,
                1100, 3100, 1100,
                1000, 2600, 1000,
            ], dtype=float)

        # Add natural variation
        noise = np.random.normal(0, 80, 9)
        # Movement spike
        if mv > 0:
            noise += np.random.normal(0, mv * 600, 9)

        result = np.clip(base_vals + noise, 0, FSR_MAX)
        # Smooth with previous values
        smoothed = 0.7 * result + 0.3 * np.array(self._last_fsr)
        self._last_fsr = smoothed.tolist()
        return [round(v, 1) for v in smoothed]

    # ------------------------------------------------------------------
    # Motion generation
    # ------------------------------------------------------------------
    def _generate_motion(self):
        mv = self.movement_intensity
        base_accel = [random.gauss(0.01, 0.01), random.gauss(-0.02, 0.01), random.gauss(0.98, 0.01)]
        base_gyro = [random.gauss(0, 0.05), random.gauss(0, 0.03), random.gauss(0, 0.02)]

        if mv > 0:
            spike = mv * 2.0
            base_accel = [v + random.gauss(0, spike) for v in base_accel]
            base_gyro = [v + random.gauss(0, spike * 3) for v in base_gyro]

        return (
            [round(v, 4) for v in base_accel],
            [round(v, 4) for v in base_gyro],
        )

    # ------------------------------------------------------------------
    # Environment generation
    # ------------------------------------------------------------------
    def _generate_env(self):
        t_var = 0.15 * math.sin(self._t * 0.01) + random.gauss(0, 0.05)
        h_var = 0.3 * math.sin(self._t * 0.008) + random.gauss(0, 0.1)

        temp1 = round(self._temp_base + self.temp_delta + t_var + 0.2, 2)
        temp2 = round(self._temp_base + self.temp_delta + t_var - 0.2, 2)
        hum1 = round(self._hum_base + self.hum_delta + h_var + 0.5, 2)
        hum2 = round(self._hum_base + self.hum_delta + h_var - 0.3, 2)

        return temp1, temp2, hum1, hum2

    # ------------------------------------------------------------------
    # EEG generation (batched 250 Hz samples)
    # ------------------------------------------------------------------
    def _generate_eeg_batch(self, n_samples: int = 250) -> List[float]:
        fs = 250.0
        t = np.arange(n_samples) / fs + self._eeg_phase

        # Alpha wave dominant (simulating relaxed/sleepy state)
        alpha = 30 * np.sin(2 * np.pi * 10.5 * t)   # 10.5 Hz alpha
        delta = 20 * np.sin(2 * np.pi * 2.0 * t)     # 2 Hz delta
        theta = 10 * np.sin(2 * np.pi * 6.0 * t)     # 6 Hz theta

        noise = np.random.normal(0, 15 * self.eeg_noise_level, n_samples)

        if self.interference_50hz:
            interference = 80 * np.sin(2 * np.pi * 50.0 * t)
        else:
            interference = np.zeros(n_samples)

        if self.poor_contact:
            raw = noise * 5 + np.random.uniform(-200, 200, n_samples)
        else:
            raw = alpha + delta + theta + noise + interference

        # Shift to ADC-like range (0..4095, centre at 2048)
        raw = raw + 2048
        raw = np.clip(raw, 0, 4095)

        self._eeg_phase += n_samples / fs
        self._eeg_seq += 1

        return [round(float(v), 1) for v in raw]

    # ------------------------------------------------------------------
    # Main loop
    # ------------------------------------------------------------------
    async def _loop(self):
        while self._running:
            self._t += 1.0

            # Decay movement counter
            if self._movement_counter > 0:
                self._movement_counter -= 1
                if self._movement_counter == 0:
                    self.movement_intensity = 0.0

            fsr = self._generate_fsr()
            accel, gyro = self._generate_motion()
            temp1, temp2, hum1, hum2 = self._generate_env()
            eeg_samples = self._generate_eeg_batch(250)  # 1 second of 250 Hz

            packet = {
                "fsr": fsr,
                "temp1": temp1,
                "temp2": temp2,
                "hum1": hum1,
                "hum2": hum2,
                "accel": accel,
                "gyro": gyro,
                "eeg": {
                    "sampleRate": 250,
                    "samples": eeg_samples,
                    "sequence": self._eeg_seq,
                },
                "ts": int(time.time()),
                "source": "simulation",
            }

            try:
                await self._callback(packet)
            except Exception:
                pass

            await asyncio.sleep(1.0)
