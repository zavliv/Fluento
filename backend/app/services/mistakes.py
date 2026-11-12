import json
import logging

import groq
from pydantic import ValidationError

from app.db import db, now
from app.schemas.mistakes import CATEGORIES, ExtractedMistake
from app.services.app_settings import get_app_settings
from app.services.llm import client

logger = logging.getLogger("fluento.mistakes")

MAX_PER_MESSAGE = 5
KNOWN_RULES = 30

INSTRUCTIONS = f"""You find English mistakes in one message written by an English learner.
Return a JSON object: {{"mistakes": [...]}}. Each mistake has exactly these keys:

- "original": the learner's wrong words, copied exactly from their message (only the wrong part, with a little context).
- "correction": the same words, corrected.
- "category": one of {", ".join(f'"{c}"' for c in CATEGORIES)}.
- "rule": a short, reusable name for the rule, like "past simple of irregular verbs" or "a vs an".
- "explanation": one short, friendly sentence explaining the rule.

Rules:
- Only report real mistakes in English. If the message is correct, return {{"mistakes": []}}.
- Ignore casual chat style: a missing full stop at the end, a lowercase first letter, comma splices, emojis, and common short forms like "ok".
- Ignore words in other languages (for example Hindi or Hinglish) and names.
- Ignore text the learner quotes on purpose: asking "is 'X' correct?", or describing an earlier mistake like "I wrote 'X' instead of 'Y'". Those quoted words are not new mistakes.
- Report each mistake once, at most {MAX_PER_MESSAGE}, most important first.
- If one of the learner's known rules fits, reuse its name exactly.
- Respond with JSON only."""


async def extract_mistakes(text: str, previous_reply: str, known_rules: list[str]) -> list[ExtractedMistake]:
    app_settings = await get_app_settings()
    prompt = (
        f"Known rules for this learner: {json.dumps(known_rules)}\n\n"
        f"The teacher's previous message (context only, don't check it):\n{previous_reply[:800] or '(none)'}\n\n"
        f"The learner's message to check:\n{text[:2000]}"
    )
    response = await client.chat.completions.create(
        model=app_settings["llm_model"],
        messages=[{"role": "system", "content": INSTRUCTIONS}, {"role": "user", "content": prompt}],
        temperature=0,
        max_completion_tokens=1500,
        response_format={"type": "json_object"},
    )
    data = json.loads(response.choices[0].message.content or "{}")
    found: list[ExtractedMistake] = []
    for item in data.get("mistakes", [])[:MAX_PER_MESSAGE]:
        try:
            mistake = ExtractedMistake(**item)
        except (ValidationError, TypeError):
            continue
        if mistake.original.lower() != mistake.correction.lower():
            found.append(mistake)
    return found


async def record_mistakes(user: dict, teacher: dict, messages: list[dict]) -> int:
    if not (await get_app_settings())["mistakes_enabled"]:
        return 0
    index = next((i for i in range(len(messages) - 1, -1, -1) if messages[i]["role"] == "user"), None)
    if index is None:
        return 0
    message = messages[index]
    checked = await db.mistakes.find_one({"user_id": user["_id"], "message_id": message["id"]}, {"source": 1})
    if checked and checked.get("source") == message["content"]:
        return 0
    previous = next((m["content"] for m in reversed(messages[:index]) if m["role"] == "assistant"), "")
    known = await db.mistakes.distinct("rule", {"user_id": user["_id"]})
    try:
        mistakes = await extract_mistakes(message["content"], previous, known[-KNOWN_RULES:])
    except (groq.GroqError, json.JSONDecodeError, AttributeError) as exc:
        logger.warning("Mistake check failed for %s: %s", user["_id"], exc)
        return 0

    await db.mistakes.delete_many({"user_id": user["_id"], "message_id": message["id"]})
    if mistakes:
        await db.mistakes.insert_many(
            [
                {
                    **m.model_dump(),
                    "user_id": user["_id"],
                    "teacher_id": teacher["_id"],
                    "message_id": message["id"],
                    "source": message["content"],
                    "mastered": False,
                    "created_at": now(),
                }
                for m in mistakes
            ]
        )
    return len(mistakes)
