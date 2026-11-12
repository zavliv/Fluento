from datetime import datetime

from pydantic import BaseModel, EmailStr, Field

from app.schemas.memory import Level


class SignupRequest(BaseModel):
    name: str = Field(min_length=1, max_length=60)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class UserOut(BaseModel):
    id: str
    name: str
    email: str
    created_at: datetime
    level: Level | None = None
    level_tested_at: datetime | None = None
    goal: str | None = None


class MeResponse(BaseModel):
    user: UserOut | None


def user_out(doc: dict) -> UserOut:
    tested = doc.get("level") or {}
    return UserOut(
        id=str(doc["_id"]),
        name=doc["name"],
        email=doc["email"],
        created_at=doc["created_at"],
        level=tested.get("level"),
        level_tested_at=tested.get("tested_at"),
        goal=doc.get("goal"),
    )
