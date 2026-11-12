from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator

from app.schemas.memory import Level

LEVELS: tuple[Level, ...] = ("A1", "A2", "B1", "B2", "C1", "C2")
LEVEL_NAMES: dict[str, str] = {
    "A1": "Beginner",
    "A2": "Elementary",
    "B1": "Intermediate",
    "B2": "Upper intermediate",
    "C1": "Advanced",
    "C2": "Proficient",
}
Status = Literal["in_progress", "completed"]


def _clean_list(items: object, limit: int = 4) -> list[str]:
    if not isinstance(items, list):
        return []
    return [" ".join(str(i).split())[:200] for i in items if str(i).strip()][:limit]


class LevelTestConfig(BaseModel):
    enabled: bool = True
    question_count: int = Field(default=6, ge=3, le=12)
    examiner_prompt: str = Field(min_length=20, max_length=6000)
    grading_prompt: str = Field(min_length=20, max_length=8000)


class LevelTestPublicConfig(BaseModel):
    enabled: bool
    question_count: int


class SkillScores(BaseModel):
    grammar: Level
    vocabulary: Level
    fluency: Level
    comprehension: Level


class LevelResult(BaseModel):
    level: Level
    scores: SkillScores
    summary: str = Field(max_length=600)
    strengths: list[str] = []
    improvements: list[str] = []
    recommended_teacher_id: str | None = None
    recommendation_reason: str = Field(default="", max_length=300)

    @field_validator("strengths", "improvements", mode="before")
    @classmethod
    def _lists(cls, value: object) -> list[str]:
        return _clean_list(value)

    @field_validator("summary", "recommendation_reason", mode="before")
    @classmethod
    def _text(cls, value: object) -> str:
        return " ".join(str(value or "").split())


class TestMessage(BaseModel):
    role: Literal["examiner", "learner"]
    content: str


class LevelTestOut(BaseModel):
    id: str
    status: Status
    question_count: int
    answered: int
    messages: list[TestMessage]
    result: LevelResult | None = None
    created_at: datetime
    completed_at: datetime | None = None


class LevelTestState(BaseModel):
    config: LevelTestPublicConfig
    current: LevelTestOut | None
    latest: LevelTestOut | None


class AnswerRequest(BaseModel):
    text: str = Field(min_length=1, max_length=2000)


class AdminLevelTest(BaseModel):
    id: str
    user_id: str
    user_name: str
    user_email: str
    level: Level
    scores: SkillScores
    recommended_teacher_id: str | None
    completed_at: datetime


class AdminLevelTests(BaseModel):
    distribution: dict[str, int]
    tests: list[AdminLevelTest]


def level_test_out(doc: dict) -> LevelTestOut:
    messages = doc.get("messages", [])
    return LevelTestOut(
        id=str(doc["_id"]),
        status=doc["status"],
        question_count=doc["question_count"],
        answered=sum(1 for m in messages if m["role"] == "learner"),
        messages=[TestMessage(**m) for m in messages],
        result=LevelResult(**doc["result"]) if doc.get("result") else None,
        created_at=doc["created_at"],
        completed_at=doc.get("completed_at"),
    )
