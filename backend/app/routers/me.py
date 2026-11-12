from fastapi import APIRouter, Depends, HTTPException

from app.db import db, now
from app.schemas.conversations import ConversationSummary, MessagesUpdate, MyTeachersUpdate, StoredMessage
from app.schemas.memory import MemoryFields, MemoryResponse, MemorySettings
from app.schemas.recommend import GoalUpdate, Recommendation
from app.security import current_user
from app.services.app_settings import get_app_settings
from app.services.conversations import save_conversation
from app.services.guardrails import trusted_history
from app.services.memory import get_memory
from app.services.recommend import recommend

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


@router.get("/recommendation")
async def my_recommendation(user: dict = Depends(current_user)) -> Recommendation:
    return await recommend(user)


@router.put("/goal")
async def update_goal(body: GoalUpdate, user: dict = Depends(current_user)) -> Recommendation:
    await db.users.update_one({"_id": user["_id"]}, {"$set": {"goal": body.goal}})
    return await recommend({**user, "goal": body.goal})


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
    messages = await trusted_history(user["_id"], teacher_id, [m.model_dump() for m in body.messages])
    await save_conversation(user["_id"], teacher_id, messages)
    return {"ok": True}


@router.delete("/conversations/{teacher_id}")
async def delete_conversation(teacher_id: str, user: dict = Depends(current_user)) -> dict:
    await db.conversations.delete_one({"user_id": user["_id"], "teacher_id": teacher_id})
    return {"ok": True}


@router.get("/memory")
async def my_memory(user: dict = Depends(current_user)) -> MemoryResponse:
    return MemoryResponse(
        enabled=user.get("memory_enabled", True),
        available=(await get_app_settings())["memory_enabled"],
        memory=await get_memory(user["_id"]),
    )


@router.put("/memory")
async def edit_my_memory(body: MemoryFields, user: dict = Depends(current_user)) -> MemoryResponse:
    await db.memories.update_one(
        {"_id": user["_id"]},
        {"$set": {**body.model_dump(), "updated_at": now()}, "$setOnInsert": {"created_at": now()}},
        upsert=True,
    )
    return await my_memory(user)


@router.delete("/memory")
async def clear_my_memory(user: dict = Depends(current_user)) -> dict:
    await db.memories.delete_one({"_id": user["_id"]})
    return {"ok": True}


@router.put("/memory/settings")
async def update_memory_settings(body: MemorySettings, user: dict = Depends(current_user)) -> MemoryResponse:
    await db.users.update_one({"_id": user["_id"]}, {"$set": {"memory_enabled": body.enabled}})
    return await my_memory({**user, "memory_enabled": body.enabled})
