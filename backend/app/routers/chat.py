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
from app.services.conversations import bump_teacher, save_conversation

router = APIRouter(tags=["chat"])
_background: set[asyncio.Task] = set()


async def _persist(user_id, teacher_id: str, messages: list[dict]) -> None:
    await save_conversation(user_id, teacher_id, messages)
    await bump_teacher(user_id, teacher_id)


async def _stream(user: dict, teacher: dict, body: ChatRequest) -> AsyncIterator[str]:
    history = [m.model_dump() for m in body.messages]
    parts: list[str] = []
    try:
        async for event in teacher_reply(teacher, history):
            if event["type"] == "text":
                parts.append(event["text"])
            yield f"data: {json.dumps(event)}\n\n"
    finally:
        reply = "".join(parts).strip()
        if reply:
            history.append(
                {
                    "id": body.reply_id,
                    "role": "assistant",
                    "content": reply,
                    "created_at": int(time.time() * 1000),
                    "feedback": None,
                }
            )
        task = asyncio.create_task(_persist(user["_id"], teacher["_id"], history))
        _background.add(task)
        task.add_done_callback(_background.discard)


@router.post("/chat")
async def chat(body: ChatRequest, user: dict = Depends(current_user)) -> StreamingResponse:
    teacher = await db.teachers.find_one({"_id": body.teacher_id, "enabled": True})
    if teacher is None:
        raise HTTPException(status_code=404, detail="This teacher isn't available.")
    if body.messages[-1].role != "user":
        raise HTTPException(status_code=400, detail="The last message must come from the learner.")
    return StreamingResponse(_stream(user, teacher, body), media_type="text/event-stream")
