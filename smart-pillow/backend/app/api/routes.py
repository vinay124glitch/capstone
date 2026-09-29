"""All FastAPI API routes."""
from __future__ import annotations
import logging
import time
from datetime import datetime
from typing import Any, Dict, Optional
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel

from app.schemas.schemas import (
    SessionStartRequest, SessionStopRequest,
    PositionPredictRequest, AppSettings, HealthResponse, DeviceStatusResponse
)
from app.services.state_manager import app_state
from app.services.session_service import session_service
from app.services.settings_service import settings_service
from app.services.report_service import generate_pdf_report, generate_csv_report
from app.services.mock_generator import MockGenerator
from app.websocket.ws_handler import ingest_mock_packet
from app.signal_processing.pressure_analyzer import rule_classifier, ml_classifier

logger = logging.getLogger(__name__)
router = APIRouter()


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------
@router.get("/health", response_model=HealthResponse)
async def health():
    return HealthResponse(status="ok", version="1.0.0", db="connected")


class ModeRequest(BaseModel):
    mode: str


# ---------------------------------------------------------------------------
# Device status & Mode Control
# ---------------------------------------------------------------------------
@router.get("/device/status", response_model=DeviceStatusResponse)
async def device_status():
    is_online = False
    if app_state.device_mode == "hardware":
        if app_state.last_packet_time:
            is_online = (datetime.utcnow() - app_state.last_packet_time).total_seconds() < 4.0
        app_state.device_connected = is_online
    else:
        is_online = app_state.device_connected

    return DeviceStatusResponse(
        connected=is_online,
        mode=app_state.device_mode,
        last_packet_time=app_state.last_packet_time if is_online else None,
        packet_rate=round(app_state.packet_rate, 2) if is_online else 0.0,
        uptime_seconds=round(app_state.uptime_seconds, 1),
    )


@router.post("/mode")
async def set_mode(req: ModeRequest):
    target = req.mode.lower()
    if target == "hardware":
        if app_state.mock_generator:
            await app_state.mock_generator.stop()
            app_state.mock_generator = None
        app_state.device_mode = "hardware"
        app_state.last_packet_time = None
        app_state.packet_timestamps.clear()
        app_state.device_connected = False
        app_state.latest_analytics = None
        await app_state.broadcast({
            "type": "device_status",
            "connected": False,
            "mode": "hardware",
            "packet_rate": 0.0,
        })
        return {"status": "ok", "mode": "hardware", "connected": False}
    else:
        app_state.device_mode = "simulation"
        app_state.device_connected = True
        if not app_state.mock_generator or not app_state.mock_generator._running:
            mock = MockGenerator(callback=ingest_mock_packet)
            app_state.mock_generator = mock
            await mock.start()
        await app_state.broadcast({
            "type": "device_status",
            "connected": True,
            "mode": "simulation",
            "packet_rate": round(app_state.packet_rate, 2),
        })
        return {"status": "ok", "mode": "demo", "connected": True}


@router.post("/hardware/calibrate")
async def calibrate_hardware():
    return {"status": "calibrated", "offsets": [0, 0, 0, 0, 0, 0]}


# ---------------------------------------------------------------------------
# Mock / Demo control
# ---------------------------------------------------------------------------
@router.post("/mock/start")
async def start_mock():
    if app_state.mock_generator and app_state.mock_generator._running:
        return {"status": "already_running"}
    app_state.device_mode = "simulation"
    app_state.device_connected = True
    mock = MockGenerator(callback=ingest_mock_packet)
    app_state.mock_generator = mock
    await mock.start()
    return {"status": "started"}


@router.post("/mock/stop")
async def stop_mock():
    if app_state.mock_generator:
        await app_state.mock_generator.stop()
        app_state.mock_generator = None
    app_state.device_connected = False
    app_state.device_mode = "hardware"
    return {"status": "stopped"}


@router.post("/mock/position/{position}")
async def set_mock_position(position: str):
    if not app_state.mock_generator:
        raise HTTPException(status_code=400, detail="Mock not running")
    app_state.mock_generator.set_position(position)
    return {"position": position}


@router.post("/mock/movement")
async def trigger_mock_movement(intensity: float = 0.8, duration: float = 3.0):
    if not app_state.mock_generator:
        raise HTTPException(status_code=400, detail="Mock not running")
    app_state.mock_generator.trigger_movement(intensity, duration)
    return {"triggered": True}


@router.post("/mock/eeg/noise")
async def set_eeg_noise(level: float = 1.0):
    if app_state.mock_generator:
        app_state.mock_generator.set_eeg_noise(level)
    return {"level": level}


@router.post("/mock/eeg/poor_contact")
async def set_poor_contact(value: bool = True):
    if app_state.mock_generator:
        app_state.mock_generator.set_poor_contact(value)
    return {"poor_contact": value}


@router.post("/mock/eeg/interference")
async def set_50hz_interference(value: bool = True):
    if app_state.mock_generator:
        app_state.mock_generator.set_50hz_interference(value)
    return {"interference": value}


# ---------------------------------------------------------------------------
# Sessions
# ---------------------------------------------------------------------------
@router.post("/session/start")
async def start_session(req: SessionStartRequest = SessionStartRequest()):
    result = await session_service.start_session(req.notes or "")
    if "error" in result:
        raise HTTPException(status_code=409, detail=result["error"])
    return result


@router.post("/session/stop")
async def stop_session(req: SessionStopRequest = SessionStopRequest()):
    result = await session_service.stop_session()
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@router.get("/session/current")
async def current_session():
    return {
        "active": app_state.session_active,
        "session_uuid": app_state.session_uuid,
        "start_time": app_state.session_start.isoformat() if app_state.session_start else None,
        "duration_seconds": (datetime.utcnow() - app_state.session_start).total_seconds()
        if app_state.session_start else 0,
        "sample_count": app_state.sample_count,
        "current_position": app_state.current_position,
        "sleep_score": app_state.current_score,
        "score_breakdown": app_state.score_breakdown,
    }


@router.get("/sessions")
async def get_sessions(limit: int = 50):
    return await session_service.get_sessions(limit)


@router.get("/sessions/{session_id}")
async def get_session(session_id: int):
    s = await session_service.get_session(session_id)
    if not s:
        raise HTTPException(status_code=404, detail="Session not found")
    return s


@router.delete("/sessions/{session_id}")
async def delete_session(session_id: int):
    ok = await session_service.delete_session(session_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"deleted": True}


# ---------------------------------------------------------------------------
# Position prediction
# ---------------------------------------------------------------------------
@router.post("/predict-position")
async def predict_position(req: PositionPredictRequest):
    # Try ML first
    ml_result = ml_classifier.predict(req.fsr)
    if ml_result:
        return {
            "position": ml_result.position,
            "confidence": ml_result.confidence,
            "classifier_type": ml_result.classifier_type,
        }
    result = rule_classifier.predict(req.fsr)
    return {
        "position": result.position,
        "confidence": result.confidence,
        "classifier_type": result.classifier_type,
    }


# ---------------------------------------------------------------------------
# Export
# ---------------------------------------------------------------------------
@router.get("/export/session/{session_id}/csv")
async def export_csv(session_id: int):
    s = await session_service.get_session(session_id)
    if not s:
        raise HTTPException(status_code=404, detail="Session not found")
    csv_data = generate_csv_report(s)
    return StreamingResponse(
        iter([csv_data]),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=sleep_report_{session_id}.csv"
        }
    )


@router.get("/export/session/{session_id}/pdf")
async def export_pdf(session_id: int):
    s = await session_service.get_session(session_id)
    if not s:
        raise HTTPException(status_code=404, detail="Session not found")
    pdf_bytes = generate_pdf_report(s)
    return StreamingResponse(
        iter([pdf_bytes]),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=sleep_report_{session_id}.pdf"
        }
    )


# ---------------------------------------------------------------------------
# Settings
# ---------------------------------------------------------------------------
@router.get("/settings")
async def get_settings():
    return await settings_service.get()


@router.put("/settings")
async def update_settings(data: Dict[str, Any]):
    return await settings_service.update(data)


@router.post("/settings/reset")
async def reset_settings():
    return await settings_service.reset()


# ---------------------------------------------------------------------------
# Live analytics snapshot
# ---------------------------------------------------------------------------
@router.get("/analytics/current")
async def current_analytics():
    if not app_state.latest_analytics:
        return {"status": "no_data"}
    return app_state.latest_analytics
