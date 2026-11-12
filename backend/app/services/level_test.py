import json
import logging

from pydantic import ValidationError

from app.db import db
from app.schemas.level_test import LEVEL_NAMES, LEVELS, LevelResult, LevelTestConfig
from app.services.app_settings import get_app_settings
from app.services.llm import complete

logger = logging.getLogger("fluento.level_test")

CONFIG_ID = "level_test"

EXAMINER_PROMPT = """You are the {app} placement examiner. You run a short, friendly English placement chat with a learner called {name}.
The test has exactly {count} questions. You are now writing question {number} of {count}.

- Ask exactly one question per message.
- On question 1, greet the learner in one short sentence, say there are {count} quick questions and that they can answer in their own words, then ask the first question.
- Start easy (A1-A2: their name, home, daily routine) and make each question harder, adapting to how well they answered so far: past experiences, future plans, opinions with reasons, hypothetical situations, then abstract or debatable topics for strong learners.
- From question 2, react to their last answer in a few friendly words, then ask the next question.
- Never correct mistakes, teach, hint at their level, or give scores during the test.
- If an answer is very short, off-topic or not in English, don't comment on it; simply move on.
- Keep each message to 1-2 short sentences of plain English. No markdown, lists or emojis."""

GRADING_PROMPT = """You are an experienced CEFR examiner. You assess an English learner from a short written placement chat.
Judge only the learner's answers; the examiner's questions get harder as the chat goes on.

CEFR guide:
- A1: isolated words and very simple phrases about themselves.
- A2: short simple sentences about familiar topics; frequent basic errors.
- B1: connected text on familiar topics; can describe experiences and give brief reasons; noticeable errors.
- B2: clear, detailed text; can argue a viewpoint; good control with some errors.
- C1: fluent, well-structured, flexible language; rare errors.
- C2: precise, natural and nuanced, like an educated native writer.

Be fair and slightly conservative: if the learner sits between two levels, choose the lower one.
Very short, copied or non-English answers count as weak evidence for a higher level.

Return a JSON object with exactly these keys:
- "level": the overall level, one of "A1", "A2", "B1", "B2", "C1", "C2".
- "scores": {"grammar", "vocabulary", "fluency", "comprehension"}, each a CEFR level.
- "summary": 2-3 friendly sentences to the learner, in "you" form, explaining the result.
- "strengths": 2-3 short things they do well.
- "improvements": 2-3 short, specific things to work on next.
- "recommended_teacher_id": the id of the best teacher for them from the list below.
- "recommendation_reason": one short sentence explaining that choice.

Teachers:
{teachers}

Respond with JSON only."""

DEFAULT_CONFIG = LevelTestConfig(
    enabled=True,
    question_count=6,
    examiner_prompt=EXAMINER_PROMPT,
    grading_prompt=GRADING_PROMPT,
)


class GradingError(Exception):
    pass


async def get_config() -> LevelTestConfig:
    doc = await db.settings.find_one({"_id": CONFIG_ID}) or {}
    return LevelTestConfig(**{**DEFAULT_CONFIG.model_dump(), **{k: v for k, v in doc.items() if k != "_id"}})


async def save_config(config: LevelTestConfig) -> LevelTestConfig:
    await db.settings.update_one({"_id": CONFIG_ID}, {"$set": config.model_dump()}, upsert=True)
    return config


def _fill(template: str, values: dict[str, str]) -> str:
    for key, value in values.items():
        template = template.replace("{" + key + "}", value)
    return template


async def next_question(test: dict, config: LevelTestConfig, name: str) -> str:
    app_name = (await get_app_settings())["app_name"]
    number = sum(1 for m in test["messages"] if m["role"] == "learner") + 1
    system = _fill(
        config.examiner_prompt,
        {"app": app_name, "name": name.split(" ")[0], "count": str(test["question_count"]), "number": str(number)},
    )
    history = [
        {"role": "assistant" if m["role"] == "examiner" else "user", "content": m["content"]} for m in test["messages"]
    ]
    if not history:
        history = [{"role": "user", "content": "I'm ready to start the level test."}]
    text = await complete(system, history, temperature=0.6, max_tokens=600)
    return text.strip() or "Could you tell me a little about yourself?"


def _transcript(messages: list[dict]) -> str:
    return "\n".join(f"{'Examiner' if m['role'] == 'examiner' else 'Learner'}: {m['content'][:2000]}" for m in messages)


def _pick_teacher(level: str, teachers: list[dict]) -> str | None:
    beginner = LEVELS.index(level) <= 1
    advanced = LEVELS.index(level) >= 3
    for t in teachers:
        t_level = t.get("level", "All levels")
        if (beginner and t_level == "Beginner") or (advanced and t_level == "Advanced"):
            return t["_id"]
        if not beginner and not advanced and t_level in ("Intermediate", "All levels"):
            return t["_id"]
    return teachers[0]["_id"] if teachers else None


async def grade(test: dict, config: LevelTestConfig) -> LevelResult:
    teachers = await db.teachers.find({"enabled": True}).sort("order", 1).to_list()
    listing = "\n".join(
        f"- {t['_id']}: {t['name']}, {t.get('specialty', '')} ({t.get('level', 'All levels')})" for t in teachers
    )
    system = _fill(config.grading_prompt, {"teachers": listing or "- none"})
    prompt = f"Placement chat:\n{_transcript(test['messages'])}\n\nAssess the learner and return JSON."
    last_error: Exception | None = None
    for _ in range(2):
        try:
            raw = await complete(
                system, [{"role": "user", "content": prompt}], temperature=0.1, max_tokens=1500, json_mode=True
            )
            result = LevelResult(**json.loads(raw or "{}"))
        except (json.JSONDecodeError, ValidationError, TypeError) as exc:
            last_error = exc
            continue
        if result.recommended_teacher_id not in {t["_id"] for t in teachers}:
            result.recommended_teacher_id = _pick_teacher(result.level, teachers)
        return result
    logger.warning("Grading failed for test %s: %s", test["_id"], last_error)
    raise GradingError("We couldn't grade your test. Please try again.")


def describe_level(level: str) -> str:
    return f"{level} ({LEVEL_NAMES.get(level, '')})"
