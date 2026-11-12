from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

Level = Literal["Beginner", "Intermediate", "Advanced", "All levels"]
Voice = Literal["female", "male"]
Goal = Literal["speaking", "grammar", "vocabulary", "exams", "work", "beginners"]


class Persona(BaseModel):
    background: str = ""
    personality: list[str] = []
    teaching_style: list[str] = []
    correction_style: str = ""
    focus: list[str] = []
    boundaries: list[str] = []
    sample_phrases: list[str] = []
    languages: list[str] = ["English"]
    temperature: float = Field(default=0.5, ge=0, le=1.5)


class TeacherFields(BaseModel):
    name: str = Field(min_length=1, max_length=40)
    role: str = Field(min_length=1, max_length=120)
    specialty: str = Field(min_length=1, max_length=60)
    tagline: str = ""
    description: str = ""
    quote: str = ""
    level: Level = "All levels"
    voice: Voice = "female"
    color: str = Field(default="#0d9488", pattern=r"^#[0-9a-fA-F]{6}$")
    enabled: bool = True
    online: bool = True
    order: int = 0
    starters: list[str] = []
    tags: list[str] = []
    goals: list[Goal] = []
    persona: Persona = Persona()


class TeacherCreate(TeacherFields):
    id: str = Field(min_length=2, max_length=30, pattern=r"^[a-z0-9-]+$")


class TeacherPublic(BaseModel):
    id: str
    name: str
    specialty: str
    tagline: str
    description: str
    quote: str
    level: Level
    voice: Voice
    color: str
    starters: list[str]
    tags: list[str]
    goals: list[Goal]
    online: bool
    languages: list[str]


class TeacherAdmin(TeacherFields):
    id: str
    created_at: datetime | None = None
    updated_at: datetime | None = None


def teacher_public(doc: dict) -> TeacherPublic:
    fields = {k: doc.get(k) for k in TeacherPublic.model_fields if k not in ("id", "languages")}
    return TeacherPublic(id=doc["_id"], languages=doc.get("persona", {}).get("languages", ["English"]), **fields)


def teacher_admin(doc: dict) -> TeacherAdmin:
    return TeacherAdmin(id=doc["_id"], **{k: v for k, v in doc.items() if k != "_id"})
