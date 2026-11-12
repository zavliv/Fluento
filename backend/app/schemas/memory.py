from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator

Level = Literal["A1", "A2", "B1", "B2", "C1", "C2"]

MAX_ITEMS = 8
MAX_MISTAKES = 10


def _short_list(items: list[str], limit: int = MAX_ITEMS) -> list[str]:
    seen: list[str] = []
    for item in items:
        text = " ".join(str(item).split())[:160]
        if text and text.lower() not in (s.lower() for s in seen):
            seen.append(text)
    return seen[:limit]


class Mistake(BaseModel):
    pattern: str = Field(max_length=160)
    example: str = Field(default="", max_length=200)
    correction: str = Field(default="", max_length=200)
    count: int = Field(default=1, ge=1, le=999)


class MemoryFields(BaseModel):
    summary: str = Field(default="", max_length=600)
    level: Level | None = None
    goals: list[str] = []
    interests: list[str] = []
    facts: list[str] = []
    strengths: list[str] = []
    mistakes: list[Mistake] = []

    @field_validator("summary", mode="before")
    @classmethod
    def _trim_summary(cls, value: object) -> str:
        return " ".join(str(value or "").split())[:600]

    @field_validator("level", mode="before")
    @classmethod
    def _clean_level(cls, value: object) -> str | None:
        text = str(value or "").strip().upper()[:2]
        return text if text in {"A1", "A2", "B1", "B2", "C1", "C2"} else None

    @field_validator("goals", "interests", "facts", "strengths", mode="before")
    @classmethod
    def _clean_lists(cls, value: object) -> list[str]:
        return _short_list(value if isinstance(value, list) else [])

    @field_validator("mistakes", mode="before")
    @classmethod
    def _clean_mistakes(cls, value: object) -> list[dict]:
        items = [m for m in (value if isinstance(value, list) else []) if isinstance(m, dict) and m.get("pattern")]
        for m in items:
            for key in ("pattern", "example", "correction"):
                m[key] = " ".join(str(m.get(key) or "").split())[: 160 if key == "pattern" else 200]
            try:
                m["count"] = max(1, min(999, int(m.get("count") or 1)))
            except (TypeError, ValueError):
                m["count"] = 1
        items.sort(key=lambda m: -m["count"])
        return items[:MAX_MISTAKES]


class LearnerMemory(MemoryFields):
    updated_at: datetime | None = None


class MemoryResponse(BaseModel):
    enabled: bool
    available: bool
    memory: LearnerMemory | None


class MemorySettings(BaseModel):
    enabled: bool


def is_empty(memory: MemoryFields) -> bool:
    return not any(
        [memory.summary, memory.level, memory.goals, memory.interests, memory.facts, memory.strengths, memory.mistakes]
    )
