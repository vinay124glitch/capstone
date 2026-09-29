"""
Session recording service: persists sensor samples, position events,
movement events, and EEG metrics to the SQLite database.
"""
from __future__ import annotations
import uuid
import logging
from datetime import datetime
from typing import Dict, Any, Optional, List
from collections import defaultdict

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.models.database import (
    Session as DBSession, SensorSample, PositionEvent,
    MovementEvent, EEGMetric, AsyncSessionLocal
)
from app.services.state_manager import app_state

logger = logging.getLogger(__name__)


class SessionService:
    def __init__(self):
        self._prev_position: Optional[str] = None

    async def start_session(self, notes: str = "") -> Dict[str, Any]:
        if app_state.session_active:
            return {"error": "Session already running", "session_uuid": app_state.session_uuid}

        session_uuid = str(uuid.uuid4())
        async with AsyncSessionLocal() as db:
            db_session = DBSession(
                session_uuid=session_uuid,
                start_time=datetime.utcnow(),
                metrics={"notes": notes},
            )
            db.add(db_session)
            await db.commit()
            await db.refresh(db_session)
            app_state.session_id = db_session.id
            app_state.session_uuid = session_uuid
            app_state.session_active = True
            app_state.session_start = datetime.utcnow()
            app_state.sample_count = 0

        logger.info(f"Session started: {session_uuid}")
        return {"session_uuid": session_uuid, "session_id": app_state.session_id}

    async def record_sample(self, analytics: Dict[str, Any]):
        if not app_state.session_active or app_state.session_id is None:
            return

        raw = analytics.get("raw", {})
        pressure = analytics.get("pressure", {})
        position_info = analytics.get("position", {})
        movement_info = analytics.get("movement", {})
        env = analytics.get("environment", {})
        score = analytics.get("sleep_score", {})
        eeg = analytics.get("eeg", {})

        now = datetime.utcnow()

        async with AsyncSessionLocal() as db:
            # Sensor sample (every packet)
            sample = SensorSample(
                session_id=app_state.session_id,
                timestamp=now,
                fsr=raw.get("fsr"),
                temp1=raw.get("temp1"),
                temp2=raw.get("temp2"),
                hum1=raw.get("hum1"),
                hum2=raw.get("hum2"),
                accel_x=raw.get("accel", [0, 0, 0])[0],
                accel_y=raw.get("accel", [0, 0, 0])[1],
                accel_z=raw.get("accel", [0, 0, 0])[2],
                gyro_x=raw.get("gyro", [0, 0, 0])[0],
                gyro_y=raw.get("gyro", [0, 0, 0])[1],
                gyro_z=raw.get("gyro", [0, 0, 0])[2],
                position=position_info.get("position"),
                movement_level=movement_info.get("level"),
                sleep_score=score.get("score"),
            )
            db.add(sample)

            # Position event (only on change)
            new_pos = position_info.get("position", "Unknown")
            if new_pos != self._prev_position:
                pe = PositionEvent(
                    session_id=app_state.session_id,
                    timestamp=now,
                    position=new_pos,
                    confidence=position_info.get("confidence", 0.0),
                    classifier_type=position_info.get("classifier_type", "rule_based"),
                )
                db.add(pe)
                self._prev_position = new_pos

            # Movement event
            if movement_info.get("is_event"):
                me = MovementEvent(
                    session_id=app_state.session_id,
                    timestamp=now,
                    level=movement_info.get("level", "Unknown"),
                    accel_magnitude=movement_info.get("accel_magnitude"),
                    gyro_magnitude=movement_info.get("gyro_magnitude"),
                    fsr_change_rate=movement_info.get("fsr_change_rate"),
                )
                db.add(me)

            # EEG metrics (only when new FFT computed)
            if eeg.get("new_fft") and eeg.get("bands"):
                bands = eeg["bands"]
                quality = eeg.get("quality") or {}
                em = EEGMetric(
                    session_id=app_state.session_id,
                    timestamp=now,
                    delta_power=bands.get("delta"),
                    theta_power=bands.get("theta"),
                    alpha_power=bands.get("alpha"),
                    beta_power=bands.get("beta"),
                    signal_quality=quality.get("overall"),
                    electrode_contact=quality.get("electrode_contact"),
                    noise_50hz=quality.get("noise_50hz"),
                )
                db.add(em)

            await db.commit()
        app_state.sample_count += 1

    async def stop_session(self) -> Dict[str, Any]:
        if not app_state.session_active or app_state.session_id is None:
            return {"error": "No active session"}

        end_time = datetime.utcnow()
        duration = (end_time - app_state.session_start).total_seconds()

        # Aggregate metrics
        async with AsyncSessionLocal() as db:
            # Position breakdown
            pos_q = await db.execute(
                select(PositionEvent.position, func.count(PositionEvent.id).label("cnt"))
                .where(PositionEvent.session_id == app_state.session_id)
                .group_by(PositionEvent.position)
            )
            pos_counts = {row.position: row.cnt for row in pos_q}

            # Movement events
            mv_q = await db.execute(
                select(func.count(MovementEvent.id))
                .where(MovementEvent.session_id == app_state.session_id)
            )
            mv_count = mv_q.scalar() or 0

            # Average sleep score
            sc_q = await db.execute(
                select(func.avg(SensorSample.sleep_score))
                .where(SensorSample.session_id == app_state.session_id)
            )
            avg_score = sc_q.scalar() or 0.0

            # Dominant position
            dominant = max(pos_counts, key=lambda k: pos_counts[k]) if pos_counts else "Unknown"

            metrics = {
                "position_breakdown": pos_counts,
                "movement_event_count": mv_count,
                "sample_count": app_state.sample_count,
                "score_breakdown": app_state.score_breakdown,
                "duration_seconds": duration,
            }

            # Update session record
            result = await db.get(DBSession, app_state.session_id)
            if result:
                result.end_time = end_time
                result.duration_seconds = duration
                result.metrics = metrics
                result.sleep_score = round(float(avg_score), 1)
                result.dominant_position = dominant
                await db.commit()

        session_uuid = app_state.session_uuid
        session_id = app_state.session_id

        # Reset state
        app_state.session_active = False
        app_state.session_id = None
        app_state.session_uuid = None
        app_state.session_start = None
        app_state.sample_count = 0
        self._prev_position = None

        from app.signal_processing.movement_detector import movement_detector
        from app.signal_processing.sleep_scorer import sleep_scorer
        movement_detector.reset()
        sleep_scorer.reset()

        logger.info(f"Session stopped: {session_uuid}, duration={duration:.0f}s")
        return {
            "session_uuid": session_uuid,
            "session_id": session_id,
            "duration_seconds": duration,
            "metrics": metrics,
            "sleep_score": round(float(avg_score), 1),
            "dominant_position": dominant,
        }

    async def get_sessions(self, limit: int = 50) -> List[Dict]:
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(DBSession).order_by(DBSession.start_time.desc()).limit(limit)
            )
            sessions = result.scalars().all()
            return [
                {
                    "id": s.id,
                    "session_uuid": s.session_uuid,
                    "start_time": s.start_time.isoformat() if s.start_time else None,
                    "end_time": s.end_time.isoformat() if s.end_time else None,
                    "duration_seconds": s.duration_seconds,
                    "sleep_score": s.sleep_score,
                    "dominant_position": s.dominant_position,
                    "metrics": s.metrics,
                }
                for s in sessions
            ]

    async def get_session(self, session_id: int) -> Optional[Dict]:
        async with AsyncSessionLocal() as db:
            s = await db.get(DBSession, session_id)
            if not s:
                return None
            # Position events
            pe_q = await db.execute(
                select(PositionEvent).where(PositionEvent.session_id == session_id)
                .order_by(PositionEvent.timestamp)
            )
            pe_list = [
                {
                    "timestamp": pe.timestamp.isoformat(),
                    "position": pe.position,
                    "confidence": pe.confidence,
                    "classifier_type": pe.classifier_type,
                }
                for pe in pe_q.scalars().all()
            ]
            # Movement events
            me_q = await db.execute(
                select(MovementEvent).where(MovementEvent.session_id == session_id)
                .order_by(MovementEvent.timestamp)
            )
            me_list = [
                {
                    "timestamp": me.timestamp.isoformat(),
                    "level": me.level,
                    "accel_magnitude": me.accel_magnitude,
                }
                for me in me_q.scalars().all()
            ]
            # EEG metrics
            eq_q = await db.execute(
                select(EEGMetric).where(EEGMetric.session_id == session_id)
                .order_by(EEGMetric.timestamp)
            )
            eq_list = [
                {
                    "timestamp": eq.timestamp.isoformat(),
                    "delta": eq.delta_power,
                    "theta": eq.theta_power,
                    "alpha": eq.alpha_power,
                    "beta": eq.beta_power,
                    "signal_quality": eq.signal_quality,
                }
                for eq in eq_q.scalars().all()
            ]
            return {
                "id": s.id,
                "session_uuid": s.session_uuid,
                "start_time": s.start_time.isoformat() if s.start_time else None,
                "end_time": s.end_time.isoformat() if s.end_time else None,
                "duration_seconds": s.duration_seconds,
                "sleep_score": s.sleep_score,
                "dominant_position": s.dominant_position,
                "metrics": s.metrics,
                "position_events": pe_list,
                "movement_events": me_list,
                "eeg_metrics": eq_list,
            }

    async def delete_session(self, session_id: int) -> bool:
        async with AsyncSessionLocal() as db:
            s = await db.get(DBSession, session_id)
            if not s:
                return False
            await db.delete(s)
            await db.commit()
            return True


session_service = SessionService()
