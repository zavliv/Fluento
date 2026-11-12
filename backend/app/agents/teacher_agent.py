from collections.abc import AsyncIterator

from app.agents.prompt import build_system_prompt, render_learner
from app.db import db
from app.services.app_settings import get_app_settings
from app.services.llm import stream_completion
from app.services.memory import memory_active


async def system_prompt_for(teacher: dict, user: dict | None = None) -> str:
    rules = await db.rules.find({}).sort("order", 1).to_list()
    others = (
        await db.teachers.find({"enabled": True, "_id": {"$ne": teacher.get("_id")}}, {"name": 1, "specialty": 1})
        .sort("order", 1)
        .to_list()
    )
    app_name = (await get_app_settings())["app_name"]
    learner = ""
    if user is not None:
        memory = await db.memories.find_one({"_id": user["_id"]}) if await memory_active(user) else None
        learner = render_learner(user.get("name"), memory, (user.get("level") or {}).get("level"))
    return build_system_prompt(teacher, rules, app_name, others, learner)


async def teacher_reply(
    teacher: dict, messages: list[dict], user: dict | None = None, steer: str | None = None
) -> AsyncIterator[dict]:
    prompt = await system_prompt_for(teacher, user)
    if steer:
        prompt += f"\n\nNote for this reply only: {steer}"
    temperature = teacher.get("persona", {}).get("temperature")
    async for event in stream_completion(prompt, messages, temperature):
        yield event
