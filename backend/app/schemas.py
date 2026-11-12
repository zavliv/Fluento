from typing import Literal

from pydantic import BaseModel


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    teacher_id: str
    messages: list[ChatMessage]


class TeacherSummary(BaseModel):
    id: str
    name: str
    role: str
    specialty: str
    languages: list[str]


class TranscriptionResponse(BaseModel):
    text: str
