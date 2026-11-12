from collections.abc import AsyncIterator

from app.agents.prompt import build_system_prompt
from app.db import db
from app.services.llm import stream_completion


async def load_rule_sections() -> list[dict]:
    return await db.rules.find({}).sort("order", 1).to_list()


async def system_prompt_for(teacher: dict) -> str:
    return build_system_prompt(teacher, await load_rule_sections())


async def teacher_reply(teacher: dict, messages: list[dict]) -> AsyncIterator[dict]:
    prompt = await system_prompt_for(teacher)
    temperature = teacher.get("persona", {}).get("temperature")
    async for event in stream_completion(prompt, messages, temperature):
        yield event
