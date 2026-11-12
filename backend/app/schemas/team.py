from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field

AdminRole = Literal["owner", "admin"]


class AdminOut(BaseModel):
    id: str
    name: str
    email: str
    role: AdminRole
    created_at: datetime
    last_seen_at: datetime | None = None


class AdminMe(BaseModel):
    admin: AdminOut | None


class TeamMemberCreate(BaseModel):
    name: str = Field(min_length=1, max_length=60)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    role: AdminRole = "admin"


class TeamRoleUpdate(BaseModel):
    role: AdminRole


class PasswordChange(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


def admin_out(doc: dict) -> AdminOut:
    return AdminOut(
        id=str(doc["_id"]),
        name=doc["name"],
        email=doc["email"],
        role=doc.get("role", "admin"),
        created_at=doc["created_at"],
        last_seen_at=doc.get("last_seen_at"),
    )
