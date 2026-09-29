"""
Central state manager – holds shared runtime state between WebSocket,
analytics pipeline, and REST API endpoints.
"""
from __future__ import annotations
import asyncio
import time
from collections import deque
from datetime import datetime
from typing import Optional, Dict, Any, Set, List, Deque

import numpy as np


class AppState:
    """Singleton holding all runtime application state."""

    def __init__(self):
        # ---- Device / Connection ----
        self.device_connected: bool = False
        self.device_mode: str = "hardware"          # "hardware" | "simulation" (default: hardware/realtime)
        self.last_packet_time: Optional[datetime] = None
        self.packet_timestamps: Deque[float] = deque(maxlen=20)
        self.server_start: float = time.time()

        # ---- WebSocket clients ----
        self.ws_clients: Set = set()

        # ---- Latest sensor data ----
        self.latest_packet: Optional[Dict[str, Any]] = None
        self.latest_analytics: Optional[Dict[str, Any]] = None

        # ---- Session state ----
        self.session_active: bool = False
        self.session_id: Optional[int] = None
        self.session_uuid: Optional[str] = None
        self.session_start: Optional[datetime] = None
        self.sample_count: int = 0

        # ---- Rolling FSR history (for stability calc) ----
        self.fsr_history: Deque[List[float]] = deque(maxlen=60)

        # ---- Position state ----
        self.current_position: str = "Unknown"
        self.position_history: Deque[Dict] = deque(maxlen=3600)  # 1h at 1Hz

        # ---- EEG rolling buffer (2 minutes of 250 Hz = 30000 samples) ----
        self.eeg_buffer: Deque[float] = deque(maxlen=30000)
        self.eeg_bands_history: Deque[Dict] = deque(maxlen=720)  # 1h at 5s updates
        self.last_eeg_fft_time: float = 0.0

        # ---- Sleep score ----
        self.current_score: float = 0.0
        self.score_breakdown: Dict[str, float] = {}

        # ---- Mock generator handle ----
        self.mock_generator = None

        # ---- Settings cache ----
        self.settings: Optional[Dict[str, Any]] = None

    @property
    def packet_rate(self) -> float:
        if len(self.packet_timestamps) < 2:
            return 0.0
        recent = list(self.packet_timestamps)[-10:]
        if len(recent) < 2:
            return 0.0
        elapsed = recent[-1] - recent[0]
        return (len(recent) - 1) / max(elapsed, 0.001)

    @property
    def uptime_seconds(self) -> float:
        return time.time() - self.server_start

    def record_packet(self, ts: float):
        self.packet_timestamps.append(ts)
        self.last_packet_time = datetime.utcnow()
        self.device_connected = True

    async def broadcast(self, message: Dict[str, Any]):
        """Broadcast a JSON message to all connected WebSocket clients."""
        if not self.ws_clients:
            return
        dead: Set = set()
        for ws in list(self.ws_clients):
            try:
                import json
                await ws.send_text(json.dumps(message))
            except Exception:
                dead.add(ws)
        self.ws_clients -= dead


# Module-level singleton
app_state = AppState()
