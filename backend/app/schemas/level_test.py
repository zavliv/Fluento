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
Phase = Literal["quiz", "chat", "done"]
Skill = Literal["grammar", "vocabulary"]
AnswerMode = Literal["typed", "voice"]


def _text(value: object, limit: int) -> str:
    return " ".join(str(value or "").split())[:limit]


def _clean_list(items: object, limit: int = 4) -> list[str]:
    if not isinstance(items, list):
        return []
    return [_text(i, 200) for i in items if str(i).strip()][:limit]


class LevelTestConfig(BaseModel):
    enabled: bool = True
    quiz_enabled: bool = True
    quiz_count: int = Field(default=8, ge=4, le=12)
    question_count: int = Field(default=5, ge=3, le=12)
    examiner_prompt: str = Field(min_length=20, max_length=6000)
    grading_prompt: str = Field(min_length=20, max_length=8000)


class LevelTestPublicConfig(BaseModel):
    enabled: bool
    quiz_enabled: bool
    quiz_count: int
    question_count: int


class SkillScores(BaseModel):
    grammar: Level
    vocabulary: Level
    fluency: Level
    comprehension: Level


class AnswerFeedback(BaseModel):
    improved: str = ""
    tip: str = ""

    @field_validator("improved", "tip", mode="before")
    @classmethod
    def _clean(cls, value: object) -> str:
        return _text(value, 600)


class PlanItem(BaseModel):
    title: str
    detail: str = ""
    teacher_id: str | None = None
    practice_prompt: str = ""

    @field_validator("title", "detail", "practice_prompt", mode="before")
    @classmethod
    def _clean(cls, value: object) -> str:
        return _text(value, 400)


class LevelResult(BaseModel):
    level: Level
    scores: SkillScores
    summary: str = Field(max_length=800)
    strengths: list[str] = []
    improvements: list[str] = []
    recommended_teacher_id: str | None = None
    recommendation_reason: str = Field(default="", max_length=300)
    answer_feedback: list[AnswerFeedback] = []
    plan: list[PlanItem] = []
    quiz_correct: int | None = None
    quiz_total: int | None = None
    quiz_level: Level | None = None

    @field_validator("strengths", "improvements", mode="before")
    @classmethod
    def _lists(cls, value: object) -> list[str]:
        return _clean_list(value)

    @field_validator("summary", mode="before")
    @classmethod
    def _summary(cls, value: object) -> str:
        return _text(value, 800)

    @field_validator("recommendation_reason", mode="before")
    @classmethod
    def _reason(cls, value: object) -> str:
        return _text(value, 300)

    @field_validator("answer_feedback", mode="before")
    @classmethod
    def _feedback(cls, value: object) -> list:
        return [v for v in value if isinstance(v, dict)][:12] if isinstance(value, list) else []

    @field_validator("plan", mode="before")
    @classmethod
    def _plan(cls, value: object) -> list:
        return [v for v in value if isinstance(v, dict) and v.get("title")][:3] if isinstance(value, list) else []


class TestMessage(BaseModel):
    role: Literal["examiner", "learner"]
    content: str
    mode: AnswerMode | None = None


class QuizQuestion(BaseModel):
    id: str
    skill: Skill
    question: str
    options: list[str]


class QuizState(BaseModel):
    total: int
    answered: int
    current: QuizQuestion | None


class QuizReviewItem(BaseModel):
    level: Level
    skill: Skill
    question: str
    options: list[str]
    answer_index: int
    chosen: int
    correct: bool


class LevelTestOut(BaseModel):
    id: str
    status: Status
    phase: Phase
    quiz: QuizState | None = None
    question_count: int
    answered: int
    messages: list[TestMessage]
    result: LevelResult | None = None
    quiz_review: list[QuizReviewItem] = []
    created_at: datetime
    completed_at: datetime | None = None


class LevelHistoryItem(BaseModel):
    id: str
    level: Level
    scores: SkillScores
    completed_at: datetime


class LevelTestState(BaseModel):
    config: LevelTestPublicConfig
    current: LevelTestOut | None
    latest: LevelTestOut | None
    previous: LevelHistoryItem | None
    history: list[LevelHistoryItem]


class AnswerRequest(BaseModel):
    text: str = Field(min_length=1, max_length=2000)
    mode: AnswerMode = "typed"


class QuizAnswerRequest(BaseModel):
    choice: int = Field(ge=0, le=3)


class AdminLevelTest(BaseModel):
    id: str
    user_id: str
    user_name: str
    user_email: str
    level: Level
    scores: SkillScores
    recommended_teacher_id: str | None
    quiz_correct: int | None = None
    quiz_total: int | None = None
    spoken_answers: int = 0
    completed_at: datetime


class AdminLevelTests(BaseModel):
    distribution: dict[str, int]
    average_quiz_score: float | None
    spoken_share: float | None
    tests: list[AdminLevelTest]


class QuizBankQuestion(BaseModel):
    id: str
    level: Level
    skill: Skill
    question: str
    options: list[str]
    answer_index: int


class QuizBank(BaseModel):
    counts: dict[str, int]
    refilling: bool
    questions: list[QuizBankQuestion]


def quiz_state(doc: dict) -> QuizState | None:
    quiz = doc.get("quiz")
    if not quiz:
        return None
    current = None
    if doc.get("phase") == "quiz" and quiz.get("current"):
        item = next((q for q in quiz["bank"] if q["id"] == quiz["current"]), None)
        if item:
            current = QuizQuestion(
                id=item["id"], skill=item["skill"], question=item["question"], options=item["options"]
            )
    return QuizState(total=quiz["total"], answered=len(quiz["asked"]), current=current)


def quiz_review(doc: dict) -> list[QuizReviewItem]:
    quiz = doc.get("quiz")
    if not quiz or doc.get("status") != "completed":
        return []
    bank = {q["id"]: q for q in quiz["bank"]}
    return [
        QuizReviewItem(
            level=bank[a["id"]]["level"],
            skill=bank[a["id"]]["skill"],
            question=bank[a["id"]]["question"],
            options=bank[a["id"]]["options"],
            answer_index=bank[a["id"]]["answer_index"],
            chosen=a["chosen"],
            correct=a["correct"],
        )
        for a in quiz["asked"]
        if a["id"] in bank
    ]


def level_test_out(doc: dict) -> LevelTestOut:
    messages = doc.get("messages", [])
    return LevelTestOut(
        id=str(doc["_id"]),
        status=doc["status"],
        phase=doc.get("phase", "done" if doc["status"] == "completed" else "chat"),
        quiz=quiz_state(doc),
        question_count=doc["question_count"],
        answered=sum(1 for m in messages if m["role"] == "learner"),
        messages=[TestMessage(**m) for m in messages],
        result=LevelResult(**doc["result"]) if doc.get("result") else None,
        quiz_review=quiz_review(doc),
        created_at=doc["created_at"],
        completed_at=doc.get("completed_at"),
    )


def history_item(doc: dict) -> LevelHistoryItem:
    return LevelHistoryItem(
        id=str(doc["_id"]),
        level=doc["result"]["level"],
        scores=doc["result"]["scores"],
        completed_at=doc["completed_at"],
    )
