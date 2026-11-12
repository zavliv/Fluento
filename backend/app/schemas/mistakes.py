from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator

Category = Literal[
    "tense",
    "verb form",
    "agreement",
    "article",
    "preposition",
    "plural",
    "word order",
    "word choice",
    "spelling",
    "punctuation",
    "other",
]
CATEGORIES: tuple[str, ...] = Category.__args__


DASHES = str.maketrans({"\u2010": "-", "\u2011": "-", "\u2012": "-", "\u2013": "-", "\u2014": "-"})


def _clean(value: object, limit: int) -> str:
    return " ".join(str(value or "").translate(DASHES).split())[:limit]


class ExtractedMistake(BaseModel):
    original: str = Field(min_length=1, max_length=300)
    correction: str = Field(min_length=1, max_length=300)
    category: Category = "other"
    rule: str = Field(min_length=1, max_length=120)
    explanation: str = Field(default="", max_length=400)

    @field_validator("original", "correction", "rule", "explanation", mode="before")
    @classmethod
    def _trim(cls, value: object) -> str:
        return _clean(value, 400)

    @field_validator("category", mode="before")
    @classmethod
    def _known_category(cls, value: object) -> str:
        text = _clean(value, 40).lower().replace("_", " ")
        return text if text in CATEGORIES else "other"


class MistakeOut(ExtractedMistake):
    id: str
    teacher_id: str
    message_id: str
    mastered: bool
    created_at: datetime


class MistakeUpdate(BaseModel):
    mastered: bool


class CategoryCount(BaseModel):
    category: Category
    count: int


class RuleCount(BaseModel):
    rule: str
    category: Category
    count: int
    original: str
    correction: str


class MistakeSummary(BaseModel):
    enabled: bool
    total: int
    open: int
    mastered: int
    this_week: int
    categories: list[CategoryCount]
    top_rules: list[RuleCount]


def mistake_out(doc: dict) -> MistakeOut:
    return MistakeOut(
        id=str(doc["_id"]),
        teacher_id=doc["teacher_id"],
        message_id=doc["message_id"],
        original=doc["original"],
        correction=doc["correction"],
        category=doc.get("category", "other"),
        rule=doc["rule"],
        explanation=doc.get("explanation", ""),
        mastered=doc.get("mastered", False),
        created_at=doc["created_at"],
    )
