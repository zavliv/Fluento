import asyncio
import json
import time
from collections.abc import AsyncIterator

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse

from app.agents.teacher_agent import teacher_reply
from app.db import db
from app.schemas.conversations import ChatRequest
from app.security import current_user
from app.services.conversations import bump_teacher, mark_read, save_conversation
from app.services.guardrails import (
    GuardrailsConfig,
    check_limits,
    count_message,
    get_config,
    screen,
    sign,
    trusted_history,
)
from app.services.memory import maybe_update_memory
from app.services.mistakes import record_mistakes
from app.services.tasks import run_in_background

router = APIRouter(tags=["chat"])


async def _persist(user: dict, teacher: dict, messages: list[dict]) -> None:
    await save_conversation(user["_id"], teacher["_id"], messages)
    await bump_teacher(user["_id"], teacher["_id"])
    await asyncio.gather(maybe_update_memory(user, teacher, messages), record_mistakes(user, teacher, messages))


def _event(data: dict) -> str:
    return f"data: {json.dumps(data)}\n\n"


async def _queue(user: dict, teacher: dict, history: list[dict], body: ChatRequest) -> AsyncIterator[str]:
    history[-1]["receipt"] = "sent"
    run_in_background(_persist(user, teacher, history))
    yield _event({"type": "queued"})
    yield _event({"type": "done"})


def _reply(user: dict, teacher: dict, reply_id: str, content: str) -> dict:
    return {
        "id": reply_id,
        "role": "assistant",
        "content": content,
        "created_at": int(time.time() * 1000),
        "feedback": None,
        "sig": sign(user["_id"], teacher["_id"], reply_id, content),
    }


async def _stream(
    user: dict, teacher: dict, history: list[dict], body: ChatRequest, config: GuardrailsConfig
) -> AsyncIterator[str]:
    history = mark_read(history)
    parts: list[str] = []
    try:
        yield _event({"type": "read"})
        check = await screen(user, teacher, history, config)
        if check.reply:
            parts.append(check.reply)
            yield _event({"type": "text", "text": check.reply})
            yield _event({"type": "signed", "sig": sign(user["_id"], teacher["_id"], body.reply_id, check.reply)})
            yield _event({"type": "done"})
            return
        async for event in teacher_reply(teacher, history, user, check.steer):
            if event["type"] == "text":
                parts.append(event["text"])
            elif event["type"] == "done":
                reply = "".join(parts).strip()
                yield _event({"type": "signed", "sig": sign(user["_id"], teacher["_id"], body.reply_id, reply)})
            yield _event(event)
    finally:
        reply = "".join(parts).strip()
        if reply:
            history.append(_reply(user, teacher, body.reply_id, reply))
        run_in_background(_persist(user, teacher, history))


@router.post("/chat")
async def chat(body: ChatRequest, user: dict = Depends(current_user)) -> StreamingResponse:
    teacher = await db.teachers.find_one({"_id": body.teacher_id, "enabled": True})
    if teacher is None:
        raise HTTPException(status_code=404, detail="This teacher isn't available.")
    if body.messages[-1].role != "user":
        raise HTTPException(status_code=400, detail="The last message must come from the learner.")
    config = await get_config()
    await check_limits(user, body.messages[-1].content, config)
    history = await trusted_history(
        user["_id"], teacher["_id"], [m.model_dump() for m in body.messages], config.max_message_chars
    )
    await count_message(user)
    if teacher.get("online", True):
        return StreamingResponse(_stream(user, teacher, history, body, config), media_type="text/event-stream")
    return StreamingResponse(_queue(user, teacher, history, body), media_type="text/event-stream")
