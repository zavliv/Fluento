from datetime import timedelta

import jwt
from bson import ObjectId
from fastapi import Depends, HTTPException, Request, Response
from pwdlib import PasswordHash

from app.config import settings
from app.db import db, now

password_hash = PasswordHash.recommended()
ALGORITHM = "HS256"


def hash_password(password: str) -> str:
    return password_hash.hash(password)


def verify_password(password: str, hashed: str) -> bool:
    return password_hash.verify(password, hashed)


def create_session(response: Response, user_id: str) -> None:
    expires = now() + timedelta(days=settings.session_days)
    token = jwt.encode(
        {"sub": user_id, "exp": expires},
        settings.jwt_secret.get_secret_value(),
        algorithm=ALGORITHM,
    )
    response.set_cookie(
        settings.cookie_name,
        token,
        max_age=settings.session_days * 24 * 3600,
        httponly=True,
        samesite="lax",
        secure=settings.cookie_secure,
    )


def clear_session(response: Response) -> None:
    response.delete_cookie(settings.cookie_name, samesite="lax", secure=settings.cookie_secure)


async def optional_user(request: Request) -> dict | None:
    token = request.cookies.get(settings.cookie_name)
    if not token:
        return None
    try:
        payload = jwt.decode(token, settings.jwt_secret.get_secret_value(), algorithms=[ALGORITHM])
        return await db.users.find_one({"_id": ObjectId(payload["sub"])})
    except (jwt.PyJWTError, KeyError, ValueError):
        return None


async def current_user(user: dict | None = Depends(optional_user)) -> dict:
    if user is None:
        raise HTTPException(status_code=401, detail="Please log in to continue.")
    return user


async def require_admin(user: dict = Depends(current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admins only.")
    return user
