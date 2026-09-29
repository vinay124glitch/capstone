"""
Settings service: persists and loads application settings from SQLite.
"""
from __future__ import annotations
import json
import logging
from typing import Any, Dict, Optional
from sqlalchemy import select

from app.models.database import Setting, AsyncSessionLocal
from app.schemas.schemas import AppSettings

logger = logging.getLogger(__name__)

DEFAULT_SETTINGS = AppSettings().model_dump()


class SettingsService:
    KEY = "app_settings"

    async def get(self) -> Dict[str, Any]:
        async with AsyncSessionLocal() as db:
            result = await db.get(Setting, self.KEY)
            if result and result.value:
                return result.value
            return DEFAULT_SETTINGS

    async def update(self, data: Dict[str, Any]) -> Dict[str, Any]:
        async with AsyncSessionLocal() as db:
            existing = await db.get(Setting, self.KEY)
            if existing:
                existing.value = data
            else:
                db.add(Setting(key=self.KEY, value=data))
            await db.commit()
        return data

    async def reset(self) -> Dict[str, Any]:
        return await self.update(DEFAULT_SETTINGS)


settings_service = SettingsService()
