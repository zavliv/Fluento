from bson import ObjectId

from app.db import db, now


def mark_read(messages: list[dict]) -> list[dict]:
    return [{**m, "receipt": "read"} if m["role"] == "user" else m for m in messages]


async def save_conversation(user_id: ObjectId, teacher_id: str, messages: list[dict]) -> None:
    await db.conversations.update_one(
        {"user_id": user_id, "teacher_id": teacher_id},
        {"$set": {"messages": messages, "updated_at": now()}, "$setOnInsert": {"created_at": now()}},
        upsert=True,
    )


async def bump_teacher(user_id: ObjectId, teacher_id: str) -> None:
    await db.users.update_one({"_id": user_id}, {"$pull": {"teacher_ids": teacher_id}})
    await db.users.update_one(
        {"_id": user_id},
        {"$push": {"teacher_ids": {"$each": [teacher_id], "$position": 0}}, "$set": {"last_seen_at": now()}},
    )
