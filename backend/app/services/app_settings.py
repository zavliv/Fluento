import time

from app.config import settings
from app.db import db

SETTINGS_ID = "app"
CACHE_SECONDS = 5

DEFAULTS = {
    "app_name": "Fluento",
    "llm_model": settings.llm_model,
    "llm_temperature": settings.llm_temperature,
    "llm_max_tokens": settings.llm_max_tokens,
    "history_limit": settings.history_limit,
    "stt_model": settings.stt_model,
    "tts_model": settings.tts_model,
    "tts_voice": settings.tts_voice,
    "default_teacher_id": "maya",
    "signup_enabled": True,
    "memory_enabled": True,
    "mistakes_enabled": True,
}

_cache: dict = {"value": None, "at": 0.0}


async def get_app_settings() -> dict:
    if _cache["value"] is not None and time.monotonic() - _cache["at"] < CACHE_SECONDS:
        return _cache["value"]
    doc = await db.settings.find_one({"_id": SETTINGS_ID}) or {}
    value = {**DEFAULTS, **{k: v for k, v in doc.items() if k != "_id"}}
    _cache.update(value=value, at=time.monotonic())
    return value


def clear_settings_cache() -> None:
    _cache.update(value=None, at=0.0)
