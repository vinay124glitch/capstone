"""
Tests for backend signal processing, analytics, and API.
Run with: pytest tests/ -v
"""
import pytest
import numpy as np
from unittest.mock import AsyncMock, patch


# ---------------------------------------------------------------------------
# Pressure Analyzer Tests
# ---------------------------------------------------------------------------
class TestPressureAnalyzer:
    def test_left_position(self):
        from app.signal_processing.pressure_analyzer import compute_pressure_metrics, rule_classifier
        # Heavy left-side pressure
        fsr = [3200, 800, 200, 2900, 700, 150, 3100, 750, 180]
        metrics = compute_pressure_metrics(fsr)
        assert metrics.left_sum > metrics.right_sum * 2
        result = rule_classifier.predict(fsr)
        assert result.position == "Left"

    def test_right_position(self):
        from app.signal_processing.pressure_analyzer import rule_classifier
        fsr = [200, 800, 3200, 150, 700, 2900, 180, 750, 3100]
        result = rule_classifier.predict(fsr)
        assert result.position == "Right"

    def test_back_position(self):
        from app.signal_processing.pressure_analyzer import rule_classifier
        fsr = [1200, 2800, 1200, 1100, 3100, 1100, 1000, 2600, 1000]
        result = rule_classifier.predict(fsr)
        assert result.position == "Back"

    def test_unknown_low_pressure(self):
        from app.signal_processing.pressure_analyzer import rule_classifier
        fsr = [0] * 9
        result = rule_classifier.predict(fsr)
        assert result.position == "Unknown"

    def test_fsr_length_validation(self):
        from app.schemas.schemas import SensorPacket
        p = SensorPacket(fsr=[1, 2, 3])  # too short → gets padded
        assert len(p.fsr) == 9

    def test_pressure_metrics_fields(self):
        from app.signal_processing.pressure_analyzer import compute_pressure_metrics
        fsr = [1000.0] * 9
        m = compute_pressure_metrics(fsr)
        assert m.total == pytest.approx(9000.0)
        assert 0.0 <= m.center_x <= 1.0
        assert 0.0 <= m.center_y <= 1.0
        assert 0.0 <= m.balance <= 1.0


# ---------------------------------------------------------------------------
# FSR Calculations Tests
# ---------------------------------------------------------------------------
class TestFSRCalculations:
    def test_center_of_pressure_left(self):
        from app.signal_processing.pressure_analyzer import compute_pressure_metrics
        fsr = [4000, 0, 0, 4000, 0, 0, 4000, 0, 0]
        m = compute_pressure_metrics(fsr)
        assert m.center_x < 0.25  # should be towards left

    def test_center_of_pressure_right(self):
        from app.signal_processing.pressure_analyzer import compute_pressure_metrics
        fsr = [0, 0, 4000, 0, 0, 4000, 0, 0, 4000]
        m = compute_pressure_metrics(fsr)
        assert m.center_x > 0.75  # should be towards right


# ---------------------------------------------------------------------------
# Movement Detector Tests
# ---------------------------------------------------------------------------
class TestMovementDetector:
    def test_still_classification(self):
        from app.signal_processing.movement_detector import MovementDetector
        det = MovementDetector()
        accel = [0.0, 0.0, 1.0]
        gyro = [0.0, 0.0, 0.0]
        fsr = [2000.0] * 9
        # Feed several identical packets
        for _ in range(5):
            result = det.process(accel, gyro, fsr)
        assert result.level in ("Still", "Low")

    def test_high_movement(self):
        from app.signal_processing.movement_detector import MovementDetector
        import random
        det = MovementDetector()
        for _ in range(5):
            accel = [random.gauss(0, 2.0) for _ in range(3)]
            gyro = [random.gauss(0, 10.0) for _ in range(3)]
            fsr = [random.uniform(0, 4095) for _ in range(9)]
            result = det.process(accel, gyro, fsr)
        assert result.level in ("Moderate", "High")


# ---------------------------------------------------------------------------
# EEG Processing Tests
# ---------------------------------------------------------------------------
class TestEEGProcessor:
    def test_preprocess_reduces_noise(self):
        from app.signal_processing.eeg_processor import preprocess_eeg
        import numpy as np
        t = np.arange(1000) / 250.0
        raw = np.sin(2 * np.pi * 100 * t) * 100 + np.sin(2 * np.pi * 10 * t) * 30 + 2048
        processed = preprocess_eeg(raw)
        # After filtering, 100 Hz component should be greatly attenuated
        assert processed.std() < raw.std()

    def test_band_powers_positive(self):
        from app.signal_processing.eeg_processor import compute_band_powers
        import numpy as np
        t = np.arange(1250) / 250.0
        signal = np.sin(2 * np.pi * 10 * t) * 50  # pure 10 Hz alpha
        powers = compute_band_powers(signal)
        assert powers["alpha"] > 0
        assert powers["total"] > 0

    def test_signal_quality_flat_line(self):
        from app.signal_processing.eeg_processor import compute_signal_quality
        import numpy as np
        flat = np.full(500, 2048.0)
        quality = compute_signal_quality(flat)
        assert quality["flat_line"] is True
        assert quality["overall"] < 50


# ---------------------------------------------------------------------------
# Sleep Score Tests
# ---------------------------------------------------------------------------
class TestSleepScore:
    def test_score_range(self):
        from app.signal_processing.sleep_scorer import SleepScoreCalculator
        calc = SleepScoreCalculator()
        for _ in range(10):
            result = calc.update(
                movement_level="Still",
                position="Back",
                pressure_stability=90.0,
                temp1=22.0,
                temp2=22.0,
            )
        assert 0.0 <= result["score"] <= 100.0

    def test_high_movement_lowers_score(self):
        from app.signal_processing.sleep_scorer import SleepScoreCalculator
        calc_still = SleepScoreCalculator()
        calc_moving = SleepScoreCalculator()
        for _ in range(10):
            r_still = calc_still.update("Still", "Back", 90, 22, 22)
            r_moving = calc_moving.update("High", "Unknown", 20, 35, 35)
        assert r_still["score"] > r_moving["score"]

    def test_breakdown_keys(self):
        from app.signal_processing.sleep_scorer import SleepScoreCalculator
        calc = SleepScoreCalculator()
        result = calc.update("Still", "Back", 80, 22, 22)
        assert "movement_stability" in result["breakdown"]
        assert "position_stability" in result["breakdown"]


# ---------------------------------------------------------------------------
# Sensor packet validation
# ---------------------------------------------------------------------------
class TestSensorPacketValidation:
    def test_valid_packet(self):
        from app.schemas.schemas import SensorPacket
        p = SensorPacket(
            fsr=[1000]*9, temp1=25.0, temp2=24.5,
            hum1=55.0, hum2=54.0,
            accel=[0.01, -0.02, 0.99],
            gyro=[0.1, -0.1, 0.05],
        )
        assert len(p.fsr) == 9

    def test_short_accel_padded(self):
        from app.schemas.schemas import SensorPacket
        p = SensorPacket(accel=[1.0])
        assert len(p.accel) == 3

    def test_short_fsr_padded(self):
        from app.schemas.schemas import SensorPacket
        p = SensorPacket(fsr=[100, 200])
        assert len(p.fsr) == 9


# ---------------------------------------------------------------------------
# Mock Generator Test
# ---------------------------------------------------------------------------
@pytest.mark.anyio
async def test_mock_generator_produces_packets():
    packets = []

    async def collector(pkt):
        packets.append(pkt)

    from app.services.mock_generator import MockGenerator
    import asyncio
    gen = MockGenerator(callback=collector)
    await gen.start()
    await asyncio.sleep(2.5)
    await gen.stop()

    assert len(packets) >= 2
    for pkt in packets:
        assert "fsr" in pkt
        assert len(pkt["fsr"]) == 9
        assert "eeg" in pkt
        assert pkt["eeg"]["sampleRate"] == 250
