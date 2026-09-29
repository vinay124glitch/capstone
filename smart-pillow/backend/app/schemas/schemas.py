"""Pydantic schemas for sensor data, sessions, and API responses."""
from __future__ import annotations
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, validator


# ---------------------------------------------------------------------------
# Sensor packet schemas
# ---------------------------------------------------------------------------
class EEGPacket(BaseModel):
    sampleRate: int = 250
    samples: List[float] = Field(default_factory=list)
    sequence: int = 0


class SensorPacket(BaseModel):
    """Raw JSON packet from ESP32 (or mock generator)."""
    fsr: List[float] = Field(default_factory=lambda: [0.0] * 9)
    temp1: float = 25.0
    temp2: float = 25.0
    hum1: float = 50.0
    hum2: float = 50.0
    accel: List[float] = Field(default_factory=lambda: [0.0, 0.0, 1.0])
    gyro: List[float] = Field(default_factory=lambda: [0.0, 0.0, 0.0])
    eeg: Optional[Any] = None  # Either list (legacy) or EEGPacket
    ts: Optional[int] = None

    @validator("fsr", pre=True)
    def fsr_must_be_9(cls, v):
        if isinstance(v, (list, tuple)):
            v = list(v)
            if len(v) < 9:
                v = (v + [0.0] * 9)[:9]
            elif len(v) > 9:
                v = v[:9]
            return [float(x) for x in v]
        return [0.0] * 9

    @validator("accel", pre=True)
    def accel_must_be_3(cls, v):
        if isinstance(v, dict):
            return [float(v.get("x", 0.0)), float(v.get("y", 0.0)), float(v.get("z", 1.0))]
        if isinstance(v, (list, tuple)):
            return [float(x) for x in (list(v) + [0.0, 0.0, 1.0])[:3]]
        return [0.0, 0.0, 1.0]

    @validator("gyro", pre=True)
    def gyro_must_be_3(cls, v):
        if isinstance(v, dict):
            return [float(v.get("x", 0.0)), float(v.get("y", 0.0)), float(v.get("z", 0.0))]
        if isinstance(v, (list, tuple)):
            return [float(x) for x in (list(v) + [0.0, 0.0, 0.0])[:3]]
        return [0.0, 0.0, 0.0]


# ---------------------------------------------------------------------------
# Derived analytics schemas
# ---------------------------------------------------------------------------
class PressureMetrics(BaseModel):
    fsr: List[float]
    total: float
    left_sum: float
    center_sum: float
    right_sum: float
    top_sum: float
    middle_sum: float
    bottom_sum: float
    center_x: float  # 0..1
    center_y: float  # 0..1
    balance: float   # 0..1, 0.5=perfectly balanced
    stability: float # 0..100


class MovementMetrics(BaseModel):
    accel_magnitude: float
    accel_variance: float
    gyro_magnitude: float
    gyro_variance: float
    fsr_change_rate: float
    level: str  # Still | Low | Moderate | High
    is_event: bool


class PositionResult(BaseModel):
    position: str  # Left | Right | Back | Unknown
    confidence: float  # 0..1
    classifier_type: str  # rule_based | ml


class EEGBandPowers(BaseModel):
    delta: float
    theta: float
    alpha: float
    beta: float
    total: float


class EEGSignalQuality(BaseModel):
    overall: float      # 0..100
    electrode_contact: float
    noise_50hz: float
    clipping: bool
    flat_line: bool
    excessive_amplitude: bool


class AnalyticsResult(BaseModel):
    pressure: PressureMetrics
    movement: MovementMetrics
    position: PositionResult
    sleep_score: float
    sleep_score_breakdown: Dict[str, float]
    eeg_quality: Optional[EEGSignalQuality] = None
    eeg_bands: Optional[EEGBandPowers] = None


# ---------------------------------------------------------------------------
# Session schemas
# ---------------------------------------------------------------------------
class SessionStartRequest(BaseModel):
    notes: Optional[str] = None


class SessionStopRequest(BaseModel):
    notes: Optional[str] = None


class SessionSummary(BaseModel):
    id: int
    session_uuid: str
    start_time: datetime
    end_time: Optional[datetime]
    duration_seconds: Optional[float]
    sleep_score: Optional[float]
    dominant_position: Optional[str]
    metrics: Optional[Dict[str, Any]]

    class Config:
        from_attributes = True


class SessionDetail(SessionSummary):
    position_events: List[Dict[str, Any]] = Field(default_factory=list)
    movement_events: List[Dict[str, Any]] = Field(default_factory=list)
    eeg_metrics: List[Dict[str, Any]] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Position prediction schemas
# ---------------------------------------------------------------------------
class PositionPredictRequest(BaseModel):
    fsr: List[float] = Field(..., min_items=9, max_items=9)


class PositionPredictResponse(BaseModel):
    position: str
    confidence: float
    classifier_type: str


# ---------------------------------------------------------------------------
# Settings schemas
# ---------------------------------------------------------------------------
class ThresholdSettings(BaseModel):
    movement_still_threshold: float = 0.05
    movement_low_threshold: float = 0.15
    movement_moderate_threshold: float = 0.35
    fsr_position_threshold: float = 0.2
    signal_quality_poor: float = 40.0
    signal_quality_fair: float = 70.0
    temp_min_comfort: float = 18.0
    temp_max_comfort: float = 26.0
    eeg_noise_threshold: float = 50.0


class SleepScoreWeights(BaseModel):
    movement_stability: float = 0.30
    position_stability: float = 0.25
    pressure_stability: float = 0.25
    temperature_stability: float = 0.20
    eeg_stability: float = 0.0  # enabled only when EEG present


class CalibrationData(BaseModel):
    baseline: List[float] = Field(default_factory=lambda: [0.0] * 9)
    loaded: List[float] = Field(default_factory=lambda: [4095.0] * 9)
    offsets: List[float] = Field(default_factory=lambda: [0.0] * 9)


class DeviceSettings(BaseModel):
    esp32_ip: str = "192.168.1.100"
    websocket_url: str = "ws://192.168.1.100/ws"
    auto_reconnect: bool = True
    demo_mode: bool = True
    reconnect_max_attempts: int = 10


class AppSettings(BaseModel):
    device: DeviceSettings = Field(default_factory=DeviceSettings)
    thresholds: ThresholdSettings = Field(default_factory=ThresholdSettings)
    sleep_score_weights: SleepScoreWeights = Field(default_factory=SleepScoreWeights)
    calibration: CalibrationData = Field(default_factory=CalibrationData)


# ---------------------------------------------------------------------------
# API response wrappers
# ---------------------------------------------------------------------------
class HealthResponse(BaseModel):
    status: str = "ok"
    version: str = "1.0.0"
    db: str = "connected"


class DeviceStatusResponse(BaseModel):
    connected: bool
    mode: str  # hardware | simulation
    last_packet_time: Optional[datetime]
    packet_rate: float  # packets/second
    uptime_seconds: float
