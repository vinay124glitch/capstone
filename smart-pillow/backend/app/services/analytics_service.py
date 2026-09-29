"""
Analytics pipeline: processes each incoming sensor packet and produces
derived metrics (pressure, movement, position, sleep score, EEG).
"""
from __future__ import annotations
import time
import logging
from datetime import datetime
from typing import Dict, Any, Optional, List
import numpy as np

from app.schemas.schemas import SensorPacket, AppSettings
from app.signal_processing.pressure_analyzer import (
    compute_pressure_metrics, rule_classifier, ml_classifier
)
from app.signal_processing.movement_detector import movement_detector
from app.signal_processing.sleep_scorer import sleep_scorer
from app.signal_processing.eeg_processor import (
    preprocess_eeg, compute_band_powers, compute_signal_quality, compute_fft_spectrum
)
from app.services.state_manager import app_state

logger = logging.getLogger(__name__)

EEG_FFT_INTERVAL = 5.0  # seconds between FFT updates


async def process_packet(packet: SensorPacket, settings: Optional[AppSettings] = None) -> Dict[str, Any]:
    """
    Full analytics pipeline for one sensor packet.
    Returns a dict ready to be broadcast via WebSocket and stored in DB.
    """
    ts = time.time()

    # ---- Pressure ----
    app_state.fsr_history.append(packet.fsr)
    pressure = compute_pressure_metrics(packet.fsr, history=app_state.fsr_history)

    # ---- Position ----
    # Try ML first, fall back to rule-based
    ml_result = ml_classifier.predict(packet.fsr)
    if ml_result is not None:
        position_result = ml_result
    else:
        position_result = rule_classifier.predict(packet.fsr)

    app_state.current_position = position_result.position

    # ---- Movement ----
    movement = movement_detector.process(packet.accel, packet.gyro, packet.fsr)

    # ---- EEG ----
    eeg_data = packet.eeg
    eeg_quality = None
    eeg_bands = None
    eeg_spectrum = None
    new_eeg_fft = False

    if eeg_data is not None:
        samples: List[float] = []
        if isinstance(eeg_data, dict):
            samples = eeg_data.get("samples", [])
        elif isinstance(eeg_data, list):
            samples = eeg_data

        if samples:
            app_state.eeg_buffer.extend(samples)
            raw_arr = np.array(samples, dtype=float)

            # Signal quality on the new batch
            quality_dict = compute_signal_quality(raw_arr)
            eeg_quality = quality_dict

            # FFT every N seconds
            if ts - app_state.last_eeg_fft_time >= EEG_FFT_INTERVAL:
                buf = np.array(list(app_state.eeg_buffer)[-1250:], dtype=float)  # 5s
                if len(buf) >= 256:
                    processed = preprocess_eeg(buf)
                    eeg_bands = compute_band_powers(processed)
                    freqs, amps = compute_fft_spectrum(processed)
                    eeg_spectrum = {
                        "freqs": freqs.tolist(),
                        "amplitudes": amps.tolist(),
                    }
                    app_state.last_eeg_fft_time = ts
                    new_eeg_fft = True

    # ---- Sleep Score ----
    eq_score: Optional[float] = None
    if eeg_quality is not None:
        eq_score = float(eeg_quality.get("overall", 0.0))

    score_result = sleep_scorer.update(
        movement_level=movement.level,
        position=position_result.position,
        pressure_stability=pressure.stability,
        temp1=packet.temp1,
        temp2=packet.temp2,
        eeg_quality=eq_score,
    )
    app_state.current_score = score_result["score"]
    app_state.score_breakdown = score_result["breakdown"]

    # ---- Build output dict ----
    out: Dict[str, Any] = {
        "type": "sensor_update",
        "ts": ts,
        "source": "simulation" if app_state.device_mode == "simulation" else "hardware",
        "raw": {
            "fsr": packet.fsr,
            "temp1": packet.temp1,
            "temp2": packet.temp2,
            "hum1": packet.hum1,
            "hum2": packet.hum2,
            "accel": packet.accel,
            "gyro": packet.gyro,
        },
        "pressure": {
            "fsr": pressure.fsr,
            "total": pressure.total,
            "left_sum": pressure.left_sum,
            "center_sum": pressure.center_sum,
            "right_sum": pressure.right_sum,
            "top_sum": pressure.top_sum,
            "middle_sum": pressure.middle_sum,
            "bottom_sum": pressure.bottom_sum,
            "center_x": pressure.center_x,
            "center_y": pressure.center_y,
            "balance": pressure.balance,
            "stability": pressure.stability,
        },
        "position": {
            "position": position_result.position,
            "confidence": position_result.confidence,
            "classifier_type": position_result.classifier_type,
        },
        "movement": {
            "accel_magnitude": movement.accel_magnitude,
            "accel_variance": movement.accel_variance,
            "gyro_magnitude": movement.gyro_magnitude,
            "gyro_variance": movement.gyro_variance,
            "fsr_change_rate": movement.fsr_change_rate,
            "level": movement.level,
            "is_event": movement.is_event,
            "event_count": movement_detector.event_count,
        },
        "environment": {
            "temp1": packet.temp1,
            "temp2": packet.temp2,
            "avg_temp": round((packet.temp1 + packet.temp2) / 2.0, 2),
            "hum1": packet.hum1,
            "hum2": packet.hum2,
            "avg_hum": round((packet.hum1 + packet.hum2) / 2.0, 2),
        },
        "sleep_score": {
            "score": score_result["score"],
            "breakdown": score_result["breakdown"],
        },
        "eeg": {
            "quality": eeg_quality,
            "bands": eeg_bands,
            "spectrum": eeg_spectrum if new_eeg_fft else None,
            "new_fft": new_eeg_fft,
            "buffer_size": len(app_state.eeg_buffer),
            "samples": samples[:100] if eeg_data is not None and isinstance(eeg_data, dict) else [],
        },
    }

    app_state.latest_analytics = out
    return out
