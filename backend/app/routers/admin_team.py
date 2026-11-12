from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, HTTPException
from pymongo.errors import DuplicateKeyError

from app.db import db, now
from app.schemas.team import AdminOut, TeamMemberCreate, TeamRoleUpdate, admin_out
from app.security import current_admin, hash_password, require_owner

router = APIRouter(prefix="/admin/team", tags=["admin team"], dependencies=[Depends(current_admin)])


def _member_id(value: str, owner: dict) -> ObjectId:
    try:
        oid = ObjectId(value)
    except InvalidId as exc:
        raise HTTPException(status_code=404, detail="Team member not found.") from exc
    if oid == owner["_id"]:
        raise HTTPException(status_code=400, detail="You can't change or remove your own account here.")
    return oid


@router.get("")
async def list_team() -> list[AdminOut]:
    return [admin_out(a) for a in await db.admins.find({}).sort("created_at", 1).to_list()]


@router.post("", status_code=201)
async def add_member(body: TeamMemberCreate, owner: dict = Depends(require_owner)) -> AdminOut:
    doc = {
        "name": body.name.strip(),
        "email": body.email.lower(),
        "password_hash": hash_password(body.password),
        "role": body.role,
        "created_at": now(),
        "created_by": owner["_id"],
    }
    try:
        result = await db.admins.insert_one(doc)
    except DuplicateKeyError as exc:
        raise HTTPException(status_code=409, detail="A team member with this email already exists.") from exc
    doc["_id"] = result.inserted_id
    return admin_out(doc)


@router.patch("/{member_id}")
async def update_role(member_id: str, body: TeamRoleUpdate, owner: dict = Depends(require_owner)) -> AdminOut:
    oid = _member_id(member_id, owner)
    doc = await db.admins.find_one_and_update({"_id": oid}, {"$set": {"role": body.role}}, return_document=True)
    if doc is None:
        raise HTTPException(status_code=404, detail="Team member not found.")
    return admin_out(doc)


@router.delete("/{member_id}")
async def remove_member(member_id: str, owner: dict = Depends(require_owner)) -> dict:
    oid = _member_id(member_id, owner)
    if (await db.admins.delete_one({"_id": oid})).deleted_count == 0:
        raise HTTPException(status_code=404, detail="Team member not found.")
    return {"ok": True}
