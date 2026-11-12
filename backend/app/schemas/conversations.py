from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class StoredMessage(BaseModel):
    id: str = Field(min_length=1, max_length=64)
    role: Literal["user", "assistant"]
    content: str
    created_at: int
    feedback: Literal["up", "down"] | None = None
    receipt: Literal["sent", "read"] | None = None
    sig: str | None = Field(default=None, max_length=128)


class ChatRequest(BaseModel):
    teacher_id: str
    messages: list[StoredMessage] = Field(min_length=1)
    reply_id: str = Field(min_length=1, max_length=64)


class MessagesUpdate(BaseModel):
    messages: list[StoredMessage]


class MyTeachersUpdate(BaseModel):
    teacher_ids: list[str]


class ConversationSummary(BaseModel):
    teacher_id: str
    last_message: StoredMessage | None
    updated_at: datetime


class TranscriptionResponse(BaseModel):
    text: str
