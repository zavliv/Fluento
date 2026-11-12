from fastapi import APIRouter, Depends, HTTPException

from app.db import db
from app.schemas.conversations import ConversationSummary, MessagesUpdate, MyTeachersUpdate, StoredMessage
from app.security import current_user
from app.services.conversations import save_conversation

router = APIRouter(prefix="/me", tags=["me"])


@router.get("/teachers")
async def my_teachers(user: dict = Depends(current_user)) -> list[str]:
    return user.get("teacher_ids", [])


@router.put("/teachers")
async def update_my_teachers(body: MyTeachersUpdate, user: dict = Depends(current_user)) -> list[str]:
    known = {doc["_id"] async for doc in db.teachers.find({"_id": {"$in": body.teacher_ids}}, {"_id": 1})}
    ids = list(dict.fromkeys(t for t in body.teacher_ids if t in known))
    await db.users.update_one({"_id": user["_id"]}, {"$set": {"teacher_ids": ids}})
    return ids


@router.get("/conversations")
async def my_conversations(user: dict = Depends(current_user)) -> list[ConversationSummary]:
    docs = db.conversations.find(
        {"user_id": user["_id"]}, {"teacher_id": 1, "updated_at": 1, "messages": {"$slice": -1}}
    )
    return [
        ConversationSummary(
            teacher_id=doc["teacher_id"],
            last_message=StoredMessage(**doc["messages"][0]) if doc.get("messages") else None,
            updated_at=doc["updated_at"],
        )
        async for doc in docs
    ]


@router.get("/conversations/{teacher_id}")
async def get_conversation(teacher_id: str, user: dict = Depends(current_user)) -> list[StoredMessage]:
    doc = await db.conversations.find_one({"user_id": user["_id"], "teacher_id": teacher_id})
    return [StoredMessage(**m) for m in doc["messages"]] if doc else []


@router.put("/conversations/{teacher_id}")
async def replace_conversation(teacher_id: str, body: MessagesUpdate, user: dict = Depends(current_user)) -> dict:
    if await db.teachers.find_one({"_id": teacher_id}, {"_id": 1}) is None:
        raise HTTPException(status_code=404, detail="Unknown teacher.")
    await save_conversation(user["_id"], teacher_id, [m.model_dump() for m in body.messages])
    return {"ok": True}


@router.delete("/conversations/{teacher_id}")
async def delete_conversation(teacher_id: str, user: dict = Depends(current_user)) -> dict:
    await db.conversations.delete_one({"user_id": user["_id"], "teacher_id": teacher_id})
    return {"ok": True}
