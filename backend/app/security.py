from datetime import timedelta
from typing import Literal

import jwt
from bson import ObjectId
from fastapi import Depends, HTTPException, Request, Response
from pwdlib import PasswordHash

from app.config import settings
from app.db import db, now

password_hash = PasswordHash.recommended()
ALGORITHM = "HS256"

Audience = Literal["learner", "admin"]
COOKIES: dict[Audience, tuple[str, int]] = {
    "learner": (settings.cookie_name, settings.session_days),
    "admin": (settings.admin_cookie_name, settings.admin_session_days),
}


def hash_password(password: str) -> str:
    return password_hash.hash(password)


def verify_password(password: str, hashed: str) -> bool:
    return password_hash.verify(password, hashed)


def create_session(response: Response, subject_id: str, audience: Audience = "learner") -> None:
    cookie, days = COOKIES[audience]
    token = jwt.encode(
        {"sub": subject_id, "aud": audience, "exp": now() + timedelta(days=days)},
        settings.jwt_secret.get_secret_value(),
        algorithm=ALGORITHM,
    )
    response.set_cookie(
        cookie,
        token,
        max_age=days * 24 * 3600,
        httponly=True,
        samesite="lax",
        secure=settings.cookie_secure,
    )


def clear_session(response: Response, audience: Audience = "learner") -> None:
    response.delete_cookie(COOKIES[audience][0], samesite="lax", secure=settings.cookie_secure)


def _subject(request: Request, audience: Audience) -> ObjectId | None:
    token = request.cookies.get(COOKIES[audience][0])
    if not token:
        return None
    try:
        payload = jwt.decode(token, settings.jwt_secret.get_secret_value(), algorithms=[ALGORITHM], audience=audience)
        return ObjectId(payload["sub"])
    except (jwt.PyJWTError, KeyError, ValueError):
        return None


async def optional_user(request: Request) -> dict | None:
    user_id = _subject(request, "learner")
    return await db.users.find_one({"_id": user_id}) if user_id else None


async def current_user(user: dict | None = Depends(optional_user)) -> dict:
    if user is None:
        raise HTTPException(status_code=401, detail="Please log in to continue.")
    return user


async def optional_admin(request: Request) -> dict | None:
    admin_id = _subject(request, "admin")
    return await db.admins.find_one({"_id": admin_id}) if admin_id else None


async def current_admin(admin: dict | None = Depends(optional_admin)) -> dict:
    if admin is None:
        raise HTTPException(status_code=401, detail="Please sign in to the admin panel.")
    return admin


async def require_owner(admin: dict = Depends(current_admin)) -> dict:
    if admin.get("role") != "owner":
        raise HTTPException(status_code=403, detail="Only owners can manage the team.")
    return admin
