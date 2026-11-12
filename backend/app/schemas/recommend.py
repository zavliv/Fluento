from typing import Literal

from pydantic import BaseModel

LearnerGoal = Literal["speaking", "work", "exams", "grammar", "vocabulary"]
LEARNER_GOALS: dict[str, str] = {
    "speaking": "Everyday conversation",
    "work": "Work and interviews",
    "exams": "Exams like IELTS",
    "grammar": "Better grammar",
    "vocabulary": "More vocabulary",
}


class WeakSkill(BaseModel):
    skill: Literal["grammar", "vocabulary", "speaking"]
    source: Literal["challenges", "level test", "chat mistakes"]
    detail: str


class Reason(BaseModel):
    kind: Literal["goal", "weak", "level", "default"]
    text: str
    detail: str = ""


class GoalOption(BaseModel):
    id: LearnerGoal
    label: str


class Recommendation(BaseModel):
    teacher_id: str | None
    goal: LearnerGoal | None
    weak_skill: WeakSkill | None
    level: str | None
    reasons: list[Reason]
    goal_options: list[GoalOption] = [GoalOption(id=k, label=v) for k, v in LEARNER_GOALS.items()]


class GoalUpdate(BaseModel):
    goal: LearnerGoal | None
