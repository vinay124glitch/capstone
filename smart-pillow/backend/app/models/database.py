"""
Database configuration and ORM models for Smart Pillow system.
Uses SQLAlchemy async with aiosqlite backend.
"""
import os
from datetime import datetime
from typing import Optional

from sqlalchemy import (
    Column, Integer, Float, String, Boolean, DateTime,
    JSON, ForeignKey, Index, Text, create_engine
)
from sqlalchemy.orm import DeclarativeBase, relationship
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

# ---------------------------------------------------------------------------
# Engine setup
# ---------------------------------------------------------------------------
DB_PATH = os.getenv("DB_PATH", "smart_pillow.db")
ASYNC_DB_URL = f"sqlite+aiosqlite:///{DB_PATH}"
SYNC_DB_URL = f"sqlite:///{DB_PATH}"

async_engine = create_async_engine(ASYNC_DB_URL, echo=False)
AsyncSessionLocal = async_sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)


class Base(DeclarativeBase):
    pass


# ---------------------------------------------------------------------------
# Sessions table
# ---------------------------------------------------------------------------
class Session(Base):
    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_uuid = Column(String(36), unique=True, nullable=False, index=True)
    start_time = Column(DateTime, nullable=False, default=datetime.utcnow)
    end_time = Column(DateTime, nullable=True)
    duration_seconds = Column(Float, nullable=True)

    # Final aggregated metrics (JSON blob for flexibility)
    metrics = Column(JSON, nullable=True)
    sleep_score = Column(Float, nullable=True)
    dominant_position = Column(String(16), nullable=True)

    # Relationships
    sensor_samples = relationship("SensorSample", back_populates="session", cascade="all, delete-orphan")
    position_events = relationship("PositionEvent", back_populates="session", cascade="all, delete-orphan")
    movement_events = relationship("MovementEvent", back_populates="session", cascade="all, delete-orphan")
    eeg_metrics = relationship("EEGMetric", back_populates="session", cascade="all, delete-orphan")


# ---------------------------------------------------------------------------
# Sensor Samples table
# ---------------------------------------------------------------------------
class SensorSample(Base):
    __tablename__ = "sensor_samples"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(Integer, ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False)
    timestamp = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)

    # FSR (9 values stored as JSON array)
    fsr = Column(JSON, nullable=True)

    # Environment
    temp1 = Column(Float, nullable=True)
    temp2 = Column(Float, nullable=True)
    hum1 = Column(Float, nullable=True)
    hum2 = Column(Float, nullable=True)

    # Motion
    accel_x = Column(Float, nullable=True)
    accel_y = Column(Float, nullable=True)
    accel_z = Column(Float, nullable=True)
    gyro_x = Column(Float, nullable=True)
    gyro_y = Column(Float, nullable=True)
    gyro_z = Column(Float, nullable=True)

    # Derived
    position = Column(String(16), nullable=True)
    movement_level = Column(String(16), nullable=True)
    sleep_score = Column(Float, nullable=True)

    session = relationship("Session", back_populates="sensor_samples")

    __table_args__ = (
        Index("ix_sensor_samples_session_time", "session_id", "timestamp"),
    )


# ---------------------------------------------------------------------------
# Position Events table
# ---------------------------------------------------------------------------
class PositionEvent(Base):
    __tablename__ = "position_events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(Integer, ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False)
    timestamp = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)

    position = Column(String(16), nullable=False)
    confidence = Column(Float, nullable=True)
    classifier_type = Column(String(32), nullable=True)  # "rule_based" | "ml"

    session = relationship("Session", back_populates="position_events")

    __table_args__ = (
        Index("ix_position_events_session", "session_id", "timestamp"),
    )


# ---------------------------------------------------------------------------
# Movement Events table
# ---------------------------------------------------------------------------
class MovementEvent(Base):
    __tablename__ = "movement_events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(Integer, ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False)
    timestamp = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)

    level = Column(String(16), nullable=False)
    accel_magnitude = Column(Float, nullable=True)
    gyro_magnitude = Column(Float, nullable=True)
    fsr_change_rate = Column(Float, nullable=True)

    session = relationship("Session", back_populates="movement_events")

    __table_args__ = (
        Index("ix_movement_events_session", "session_id", "timestamp"),
    )


# ---------------------------------------------------------------------------
# EEG Metrics table (periodic, NOT raw samples)
# ---------------------------------------------------------------------------
class EEGMetric(Base):
    __tablename__ = "eeg_metrics"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(Integer, ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False)
    timestamp = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)

    # Band powers (μV² / Hz)
    delta_power = Column(Float, nullable=True)
    theta_power = Column(Float, nullable=True)
    alpha_power = Column(Float, nullable=True)
    beta_power = Column(Float, nullable=True)

    # Quality heuristics 0-100
    signal_quality = Column(Float, nullable=True)
    electrode_contact = Column(Float, nullable=True)
    noise_50hz = Column(Float, nullable=True)

    session = relationship("Session", back_populates="eeg_metrics")

    __table_args__ = (
        Index("ix_eeg_metrics_session", "session_id", "timestamp"),
    )


# ---------------------------------------------------------------------------
# Settings table (key-value with JSON value)
# ---------------------------------------------------------------------------
class Setting(Base):
    __tablename__ = "settings"

    key = Column(String(128), primary_key=True)
    value = Column(JSON, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# ---------------------------------------------------------------------------
# DB Initialization helper
# ---------------------------------------------------------------------------
async def init_db():
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
