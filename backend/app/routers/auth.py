from fastapi import APIRouter, Depends, HTTPException, Response
from pymongo.errors import DuplicateKeyError

from app.db import db, now
from app.schemas.auth import LoginRequest, MeResponse, SignupRequest, UserOut, user_out
from app.security import clear_session, create_session, hash_password, optional_user, verify_password
from app.services.app_settings import get_app_settings

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup")
async def signup(body: SignupRequest, response: Response) -> UserOut:
    if not (await get_app_settings())["signup_enabled"]:
        raise HTTPException(status_code=403, detail="Sign-ups are closed right now.")
    doc = {
        "name": body.name.strip(),
        "email": body.email.lower(),
        "password_hash": hash_password(body.password),
        "teacher_ids": [],
        "created_at": now(),
        "last_seen_at": now(),
    }
    try:
        result = await db.users.insert_one(doc)
    except DuplicateKeyError as exc:
        raise HTTPException(status_code=409, detail="An account with this email already exists.") from exc
    doc["_id"] = result.inserted_id
    create_session(response, str(result.inserted_id))
    return user_out(doc)


@router.post("/login")
async def login(body: LoginRequest, response: Response) -> UserOut:
    user = await db.users.find_one({"email": body.email.lower()})
    if user is None or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Incorrect email or password.")
    await db.users.update_one({"_id": user["_id"]}, {"$set": {"last_seen_at": now()}})
    create_session(response, str(user["_id"]))
    return user_out(user)


@router.post("/logout")
async def logout(response: Response) -> dict:
    clear_session(response)
    return {"ok": True}


@router.get("/me")
async def me(user: dict | None = Depends(optional_user)) -> MeResponse:
    return MeResponse(user=user_out(user) if user else None)
