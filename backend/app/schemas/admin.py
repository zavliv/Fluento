from datetime import datetime
from pydantic import BaseModel

from app.schemas.conversations import StoredMessage


class TeacherUsage(BaseModel):
    teacher_id: str
    conversations: int
    messages: int


class RecentConversation(BaseModel):
    id: str
    user_name: str
    teacher_id: str
    last_message: str
    updated_at: datetime


class Stats(BaseModel):
    learners: int
    new_learners_7d: int
    conversations: int
    active_conversations_7d: int
    messages: int
    feedback_up: int
    feedback_down: int
    teacher_usage: list[TeacherUsage]
    recent: list[RecentConversation]


class AdminUser(BaseModel):
    id: str
    name: str
    email: str
    created_at: datetime
    last_seen_at: datetime | None = None
    conversations: int
    messages: int


class AdminConversationSummary(BaseModel):
    id: str
    user_id: str
    user_name: str
    user_email: str
    teacher_id: str
    message_count: int
    last_message: str
    updated_at: datetime


class AdminConversation(AdminConversationSummary):
    messages: list[StoredMessage]
    created_at: datetime | None = None
