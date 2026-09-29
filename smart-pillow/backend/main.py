"""
FastAPI application entry point.
"""
from __future__ import annotations
import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware

from app.models.database import init_db
from app.api.routes import router
from app.websocket.ws_handler import handle_browser_ws, handle_esp32_ws
from app.signal_processing.pressure_analyzer import ml_classifier

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Lifespan: startup & shutdown
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Initialising database…")
    await init_db()
    logger.info("Database ready.")

    # Try loading ML model
    model_path = os.getenv("ML_MODEL_PATH", "app/ml/position_model.pkl")
    if ml_classifier.load(model_path):
        logger.info("ML position classifier loaded.")
    else:
        logger.info("ML model not found – using rule-based classifier.")

    yield

    # Shutdown
    from app.services.state_manager import app_state
    if app_state.mock_generator:
        await app_state.mock_generator.stop()
    logger.info("Server shutdown complete.")


# ---------------------------------------------------------------------------
# App creation
# ---------------------------------------------------------------------------
app = FastAPI(
    title="Smart Pillow API",
    version="1.0.0",
    description="Sleep & Brainwave Monitoring System — Experimental Research",
    lifespan=lifespan,
)

# CORS – allow the Vite dev server and any local host
ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# REST routes
app.include_router(router, prefix="/api")


# ---------------------------------------------------------------------------
# WebSocket endpoints
# ---------------------------------------------------------------------------
@app.websocket("/ws/live")
async def ws_live(websocket: WebSocket):
    """Browser client WebSocket — receives live sensor broadcasts."""
    await handle_browser_ws(websocket)


@app.websocket("/ws/device")
async def ws_device(websocket: WebSocket):
    """ESP32 hardware WebSocket — receives raw sensor packets."""
    await handle_esp32_ws(websocket)


# ---------------------------------------------------------------------------
# Static frontend serving (production / single-server deployment)
# ---------------------------------------------------------------------------
dist_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "dist"))
if os.path.exists(dist_path):
    from fastapi.staticfiles import StaticFiles
    from starlette.responses import FileResponse

    assets_path = os.path.join(dist_path, "assets")
    if os.path.exists(assets_path):
        app.mount("/assets", StaticFiles(directory=assets_path), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # Do not catch API or WS routes
        if full_path.startswith("api") or full_path.startswith("ws"):
            return None
        file_path = os.path.join(dist_path, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(dist_path, "index.html"))
