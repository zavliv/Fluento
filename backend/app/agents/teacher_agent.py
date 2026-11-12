from collections.abc import AsyncIterator

from app.agents.prompt import build_system_prompt
from app.db import db
from app.services.app_settings import get_app_settings
from app.services.llm import stream_completion


async def system_prompt_for(teacher: dict) -> str:
    rules = await db.rules.find({}).sort("order", 1).to_list()
    others = (
        await db.teachers.find({"enabled": True, "_id": {"$ne": teacher.get("_id")}}, {"name": 1, "specialty": 1})
        .sort("order", 1)
        .to_list()
    )
    app_name = (await get_app_settings())["app_name"]
    return build_system_prompt(teacher, rules, app_name, others)


async def teacher_reply(teacher: dict, messages: list[dict]) -> AsyncIterator[dict]:
    prompt = await system_prompt_for(teacher)
    temperature = teacher.get("persona", {}).get("temperature")
    async for event in stream_completion(prompt, messages, temperature):
        yield event
