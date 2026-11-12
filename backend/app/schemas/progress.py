from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.level_test import QuizState
from app.schemas.memory import Level


class Badge(BaseModel):
    id: str
    name: str
    description: str
    earned_at: datetime | None = None


class StreakOut(BaseModel):
    current: int
    best: int
    freezes: int
    max_freezes: int
    freeze_progress: int
    freeze_every: int
    done_today: bool
    used_freeze_today: bool


class TodayOut(BaseModel):
    xp: int
    goal: int
    challenges: int


class CheckOut(BaseModel):
    available: bool
    reason: str
    next_at: datetime | None = None
    last_at: datetime | None = None


class CalendarDay(BaseModel):
    day: str
    xp: int


class ProgressOut(BaseModel):
    enabled: bool
    placed: bool
    rating: int
    level: Level
    band_progress: float
    confidence: float
    official_level: Level | None
    official_at: datetime | None
    streak: StreakOut
    today: TodayOut
    xp_week: int
    xp_total: int
    badges: list[Badge]
    catalog: list[Badge]
    calendar: list[CalendarDay]
    check: CheckOut
    league_enabled: bool
    league_opt_in: bool


class SpeakingOut(BaseModel):
    prompt: str
    answer: str | None = None
    mode: Literal["typed", "voice"] | None = None
    score: int | None = None
    feedback: str = ""
    improved: str = ""


class XpLine(BaseModel):
    label: str
    xp: int


class ChallengeResult(BaseModel):
    xp: int
    breakdown: list[XpLine]
    correct: int
    total: int
    rating_before: int
    rating_after: int
    level_before: Level
    level_after: Level
    band_progress: float
    streak: int
    streak_extended: bool
    today_xp: int
    goal: int
    goal_reached: bool
    new_badges: list[Badge]


class ChallengeOut(BaseModel):
    id: str
    kind: Literal["placement", "daily"]
    status: Literal["quiz", "speaking", "completed"]
    quiz: QuizState | None
    speaking: SpeakingOut | None
    result: ChallengeResult | None = None


class StartChallenge(BaseModel):
    tz: str | None = Field(default=None, max_length=60)


class SpeakRequest(BaseModel):
    text: str = Field(default="", max_length=2000)
    mode: Literal["typed", "voice"] = "typed"
    skip: bool = False


class LeagueEntry(BaseModel):
    rank: int
    name: str
    xp: int
    me: bool


class LeagueOut(BaseModel):
    enabled: bool
    opt_in: bool
    week: str
    ends_at: datetime
    entries: list[LeagueEntry]
    me: LeagueEntry | None
    total: int


class LeagueUpdate(BaseModel):
    opt_in: bool
