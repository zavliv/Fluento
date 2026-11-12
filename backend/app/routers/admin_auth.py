from fastapi import APIRouter, Depends, HTTPException, Response

from app.db import db, now
from app.schemas.auth import LoginRequest
from app.schemas.team import AdminMe, AdminOut, PasswordChange, admin_out
from app.security import (
    clear_session,
    create_session,
    current_admin,
    hash_password,
    optional_admin,
    verify_password,
)

router = APIRouter(prefix="/admin/auth", tags=["admin auth"])


@router.post("/login")
async def login(body: LoginRequest, response: Response) -> AdminOut:
    admin = await db.admins.find_one({"email": body.email.lower()})
    if admin is None or not verify_password(body.password, admin["password_hash"]):
        raise HTTPException(status_code=401, detail="Incorrect email or password.")
    await db.admins.update_one({"_id": admin["_id"]}, {"$set": {"last_seen_at": now()}})
    create_session(response, str(admin["_id"]), "admin")
    return admin_out(admin)


@router.post("/logout")
async def logout(response: Response) -> dict:
    clear_session(response, "admin")
    return {"ok": True}


@router.get("/me")
async def me(admin: dict | None = Depends(optional_admin)) -> AdminMe:
    return AdminMe(admin=admin_out(admin) if admin else None)


@router.put("/password")
async def change_password(body: PasswordChange, admin: dict = Depends(current_admin)) -> dict:
    if not verify_password(body.current_password, admin["password_hash"]):
        raise HTTPException(status_code=400, detail="Your current password is incorrect.")
    await db.admins.update_one(
        {"_id": admin["_id"]},
        {"$set": {"password_hash": hash_password(body.new_password)}},
    )
    return {"ok": True}
