import json
import logging

import groq
from bson import ObjectId
from pydantic import ValidationError

from app.db import db, now
from app.schemas.memory import LearnerMemory, MemoryFields
from app.services.app_settings import get_app_settings
from app.services.llm import client

logger = logging.getLogger("fluento.memory")

UPDATE_EVERY = 6
CONTEXT_MESSAGES = 4
MAX_NEW_MESSAGES = 30
_running: set[str] = set()

INSTRUCTIONS = """You keep the long-term memory of an English learner for a team of AI English teachers.
You receive the learner's current memory as JSON and part of a recent conversation with one teacher.
Return the complete, updated memory as a single JSON object with exactly these keys:

- "summary": 1-3 short sentences about who the learner is and how they are doing.
- "level": their estimated CEFR level ("A1", "A2", "B1", "B2", "C1" or "C2"), or null if unclear.
- "goals": why they are learning English (for example "pass IELTS with band 7", "job interviews in tech").
- "interests": topics they enjoy talking about.
- "facts": stable personal details that help a teacher personalise lessons (job, city, family, upcoming events).
- "strengths": things they already do well in English.
- "mistakes": recurring error patterns, each as {"pattern", "example", "correction", "count"}.

Rules:
- Only use what the learner actually said or clearly showed. Never invent details.
- Learn from the learner's messages; use the teacher's messages only to understand corrections and context.
- Keep everything from the current memory that is still true, and merge duplicates.
- For a mistake that happens again, increase its count. Give new mistakes a count of 1.
- "pattern" names the grammar or vocabulary issue in plain words, like "past simple of irregular verbs".
- "example" is the learner's wrong phrase and "correction" is the right version.
- Drop a mistake if the learner now clearly uses it correctly.
- Keep each list to 8 items or fewer (10 for mistakes), most important first.
- Write short phrases in English. Don't use the learner's name, and never guess their gender: say "the learner" or "they".
- Never store passwords, phone numbers, addresses, financial or health details.
- Respond with JSON only."""


def _transcript(messages: list[dict]) -> str:
    lines = []
    for m in messages:
        who = "Learner" if m["role"] == "user" else "Teacher"
        lines.append(f"{who}: {m['content'][:1500]}")
    return "\n".join(lines)


async def get_memory(user_id: ObjectId) -> LearnerMemory | None:
    doc = await db.memories.find_one({"_id": user_id})
    return LearnerMemory(**doc) if doc else None


async def memory_active(user: dict) -> bool:
    return user.get("memory_enabled", True) and (await get_app_settings())["memory_enabled"]


async def extract_memory(current: MemoryFields, teacher_name: str, messages: list[dict]) -> MemoryFields:
    app_settings = await get_app_settings()
    prompt = (
        f"Current memory:\n{current.model_dump_json()}\n\n"
        f"Recent conversation with the teacher {teacher_name}:\n{_transcript(messages)}\n\n"
        "Return the updated memory as JSON."
    )
    response = await client.chat.completions.create(
        model=app_settings["llm_model"],
        messages=[{"role": "system", "content": INSTRUCTIONS}, {"role": "user", "content": prompt}],
        temperature=0.2,
        max_completion_tokens=2048,
        response_format={"type": "json_object"},
    )
    return MemoryFields(**json.loads(response.choices[0].message.content or "{}"))


async def maybe_update_memory(user: dict, teacher: dict, messages: list[dict], force: bool = False) -> bool:
    key = str(user["_id"])
    if key in _running or not await memory_active(user):
        return False
    doc = await db.memories.find_one({"_id": user["_id"]}) or {}
    done = doc.get("processed", {}).get(teacher["_id"], 0)
    if done > len(messages):
        done = 0
    if not force and len(messages) - done < UPDATE_EVERY:
        return False
    if not any(m["role"] == "user" for m in messages[done:]):
        return False

    _running.add(key)
    try:
        start = max(0, done - CONTEXT_MESSAGES, len(messages) - MAX_NEW_MESSAGES)
        current = MemoryFields(**{k: v for k, v in doc.items() if k in MemoryFields.model_fields})
        updated = await extract_memory(current, teacher["name"], messages[start:])
        await db.memories.update_one(
            {"_id": user["_id"]},
            {
                "$set": {**updated.model_dump(), "updated_at": now(), f"processed.{teacher['_id']}": len(messages)},
                "$setOnInsert": {"created_at": now()},
            },
            upsert=True,
        )
        return True
    except (groq.GroqError, json.JSONDecodeError, ValidationError) as exc:
        logger.warning("Memory update failed for %s: %s", key, exc)
        return False
    finally:
        _running.discard(key)
