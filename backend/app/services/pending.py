import logging
import time
import uuid

from app.agents.teacher_agent import teacher_reply
from app.db import db, now
from app.services.conversations import mark_read
from app.services.guardrails import get_config, screen, sign
from app.services.memory import maybe_update_memory

logger = logging.getLogger("fluento.pending")
_running: set[str] = set()

LAST_IS_USER = {"$expr": {"$eq": [{"$arrayElemAt": ["$messages.role", -1]}, "user"]}}


async def _answer(teacher: dict, conversation: dict) -> bool:
    user = await db.users.find_one({"_id": conversation["user_id"]})
    if user is None:
        return False
    messages = conversation["messages"]
    check = await screen(user, teacher, messages, await get_config())
    parts: list[str] = [check.reply] if check.reply else []
    if not check.reply:
        async for event in teacher_reply(teacher, messages, user, check.steer):
            if event["type"] == "error":
                logger.warning("Couldn't answer a queued message for %s: %s", teacher["_id"], event["message"])
                return False
            if event["type"] == "text":
                parts.append(event["text"])
    reply = "".join(parts).strip()
    if not reply:
        return False

    reply_id = uuid.uuid4().hex
    answered = mark_read(messages) + [
        {
            "id": reply_id,
            "role": "assistant",
            "content": reply,
            "created_at": int(time.time() * 1000),
            "feedback": None,
            "sig": sign(user["_id"], teacher["_id"], reply_id, reply),
        }
    ]
    result = await db.conversations.update_one(
        {"_id": conversation["_id"], "messages": {"$size": len(messages)}},
        {"$set": {"messages": answered, "updated_at": now()}},
    )
    if result.modified_count:
        await maybe_update_memory(user, teacher, answered)
    return bool(result.modified_count)


async def answer_pending(teacher_id: str) -> int:
    if teacher_id in _running:
        return 0
    _running.add(teacher_id)
    answered = 0
    try:
        teacher = await db.teachers.find_one({"_id": teacher_id})
        if teacher is None or not teacher.get("online", True) or not teacher.get("enabled", True):
            return 0
        async for conversation in db.conversations.find({"teacher_id": teacher_id, **LAST_IS_USER}):
            if await _answer(teacher, conversation):
                answered += 1
        if answered:
            logger.info("Answered %d queued conversation(s) for %s", answered, teacher_id)
        return answered
    finally:
        _running.discard(teacher_id)


async def answer_all_pending() -> None:
    async for teacher in db.teachers.find({"online": True, "enabled": True}, {"_id": 1}):
        await answer_pending(teacher["_id"])
