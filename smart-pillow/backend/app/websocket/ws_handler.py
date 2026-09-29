"""
WebSocket handler for both ESP32 hardware connections and browser clients.
"""
from __future__ import annotations
import json
import logging
import time
from datetime import datetime
from typing import Any

from fastapi import WebSocket, WebSocketDisconnect

from app.schemas.schemas import SensorPacket
from app.services.state_manager import app_state
from app.services.analytics_service import process_packet
from app.services.session_service import session_service

logger = logging.getLogger(__name__)


async def handle_browser_ws(websocket: WebSocket):
    """
    Browser WebSocket client: receives live analytics broadcasts.
    Also accepts control messages from browser.
    """
    await websocket.accept()
    app_state.ws_clients.add(websocket)
    logger.info(f"Browser WS connected. Total clients: {len(app_state.ws_clients)}")

    # Send current device status immediately
    is_online = False
    if app_state.device_mode == "hardware":
        if app_state.last_packet_time:
            is_online = (datetime.utcnow() - app_state.last_packet_time).total_seconds() < 4.0
        app_state.device_connected = is_online
    else:
        is_online = app_state.device_connected

    try:
        await websocket.send_text(json.dumps({
            "type": "device_status",
            "connected": is_online,
            "mode": app_state.device_mode,
            "packet_rate": round(app_state.packet_rate, 2),
        }))
    except Exception:
        pass

    # Send current analytics only if device is online
    if app_state.latest_analytics and is_online:
        try:
            await websocket.send_text(json.dumps(app_state.latest_analytics))
        except Exception:
            pass

    try:
        while True:
            # Receive control messages from browser
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                await _handle_control_message(msg, websocket)
            except json.JSONDecodeError:
                pass
    except WebSocketDisconnect:
        logger.info("Browser WS disconnected")
    except Exception as e:
        logger.error(f"Browser WS error: {e}")
    finally:
        app_state.ws_clients.discard(websocket)


async def handle_esp32_ws(websocket: WebSocket):
    """
    ESP32 hardware WebSocket: receives raw sensor packets.
    """
    await websocket.accept()
    app_state.device_connected = True
    app_state.device_mode = "hardware"
    logger.info("ESP32 hardware device connected")
    await app_state.broadcast({
        "type": "device_status",
        "connected": True,
        "mode": "hardware",
        "packet_rate": round(app_state.packet_rate, 2),
    })

    try:
        while True:
            raw = await websocket.receive_text()
            await _ingest_raw_packet(raw)
    except WebSocketDisconnect:
        logger.info("ESP32 disconnected")
        app_state.device_connected = False
        await app_state.broadcast({
            "type": "device_status",
            "connected": False,
            "mode": "hardware",
            "packet_rate": 0.0,
        })
    except Exception as e:
        logger.error(f"ESP32 WS error: {e}")
        app_state.device_connected = False
        await app_state.broadcast({
            "type": "device_status",
            "connected": False,
            "mode": "hardware",
            "packet_rate": 0.0,
        })


async def _ingest_raw_packet(raw: str):
    """Parse, validate, process, and broadcast a raw sensor packet."""
    try:
        data = json.loads(raw)
        packet = SensorPacket.model_validate(data)
    except Exception as e:
        logger.warning(f"Malformed packet: {e}")
        return

    app_state.record_packet(time.time())

    analytics = await process_packet(packet)

    # Persist if session active
    if app_state.session_active:
        try:
            await session_service.record_sample(analytics)
        except Exception as e:
            logger.error(f"Failed to record sample: {e}")

    # Broadcast to browser clients
    await app_state.broadcast(analytics)


async def ingest_mock_packet(data: dict):
    """Called by mock generator for each simulated packet."""
    raw = json.dumps(data)
    await _ingest_raw_packet(raw)


async def _handle_control_message(msg: dict, ws: WebSocket):
    """Handle control messages sent from the browser via WebSocket."""
    msg_type = msg.get("type")
    if msg_type == "ping":
        await ws.send_text(json.dumps({"type": "pong", "ts": time.time()}))
    elif msg_type == "get_status":
        status = {
            "type": "status",
            "connected": app_state.device_connected,
            "mode": app_state.device_mode,
            "session_active": app_state.session_active,
            "session_uuid": app_state.session_uuid,
            "packet_rate": app_state.packet_rate,
        }
        await ws.send_text(json.dumps(status))
