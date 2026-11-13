import asyncio
import json
import logging
import random

import groq
from bson import ObjectId
from pydantic import ValidationError

from app.db import db, now
from app.schemas.level_test import LEVELS, LevelResult, LevelTestConfig
from app.services.app_settings import get_app_settings
from app.services.llm import complete

logger = logging.getLogger("fluento.level_test")

CONFIG_ID = "level_test"
QUIZ_PER_LEVEL = 2
QUIZ_START = 2
FORMATS = ("fill", "listen", "judge")
POOL_PER_LEVEL = 10
PER_LEVEL_IN_TEST = 4
MIN_PER_LEVEL = 2
MAX_REFILL_BATCHES = 10
REVIEWERS = 2
BATCH_PAUSE = 20
RATE_LIMIT_RETRIES = 3
RATE_LIMIT_WAIT = 30
_refill = {"running": False}

QUIZ_PROMPT = """You write multiple-choice English placement questions.
Write exactly {per_level} questions for each CEFR level (A1, A2, B1, B2, C1, C2): {total} questions in total.
For each level, mix grammar and vocabulary questions.

Each question is one sentence with a single gap shown as "___", and 4 answer options.
- Exactly one option is correct; the other three must be clearly wrong for a fluent speaker but tempting for a learner.
- Match the difficulty to the level: A1 uses everyday words and present simple; C2 uses idioms, collocations and advanced structures.
- Use neutral, international topics. No names of real people, no trick questions, no two answers that could both work.
- Every sentence must be clear and natural on its own: no pronouns without a clear meaning, no awkward word order.

Return a JSON object: {{"questions": [...]}}. Each question has exactly these keys:
"level" (A1-C2), "skill" ("grammar" or "vocabulary"), "question", "options" (4 strings), "answer_index" (0-3).
Respond with JSON only."""

EXAMINER_PROMPT = """You are the {app} placement examiner. You run a short, friendly English placement chat with a learner called {name}.
The conversation has exactly {count} questions. You are now writing question {number} of {count}.
Starting point: {start_level}.
Topic the learner picked: {topic}. Build every question around this topic so the chat feels personal and fun,
while still moving from everyday questions to past experiences, plans, opinions and hypothetical situations.

- Ask exactly one question per message.
- On question 1, greet the learner in one short sentence, say there are {count} quick questions and that they can type or speak their answers, then ask the first question.
- Begin about one level below the starting point, then make each question harder, adapting to how well they answer: everyday life, past experiences, future plans, opinions with reasons, hypothetical situations, then abstract or debatable topics for strong learners.
- From question 2, react to their last answer in a few friendly words, then ask the next question.
- Never correct mistakes, teach, hint at their level, or give scores during the test.
- If an answer is very short, off-topic or not in English, don't comment on it; simply move on.
- Sound warm and curious, like a friendly person chatting, not an examiner. Keep each message to 1-2 short sentences of plain English. No markdown or lists."""

GRADING_PROMPT = """You are an experienced CEFR examiner. You assess an English learner from a two-part placement test.

Part 1, the quick check, is an adaptive multiple-choice quiz: it measures grammar and vocabulary knowledge.
Part 2 is a short conversation: it shows how the learner actually uses English. Weigh the conversation more,
especially for fluency and comprehension. Answers marked (spoken) were given by voice and transcribed, so ignore
punctuation and capitalisation in them and judge fluency more generously.

CEFR guide:
- A1: isolated words and very simple phrases about themselves.
- A2: short simple sentences about familiar topics; frequent basic errors.
- B1: connected text on familiar topics; can describe experiences and give brief reasons; noticeable errors.
- B2: clear, detailed text; can argue a viewpoint; good control with some errors.
- C1: fluent, well-structured, flexible language; rare errors.
- C2: precise, natural and nuanced, like an educated native writer.

Be fair and slightly conservative: if the learner sits between two levels, choose the lower one.
Very short, copied, off-topic or non-English answers count as weak evidence for a higher level.
Write to the learner in friendly "you" form."""

OUTPUT_FORMAT = """Return a JSON object with exactly these keys:
- "level": the overall level, one of "A1", "A2", "B1", "B2", "C1", "C2".
- "scores": {"grammar", "vocabulary", "fluency", "comprehension"}, each a CEFR level.
- "summary": 2-3 friendly sentences explaining the result.
- "strengths": 2-3 short things they do well.
- "improvements": 2-3 short, specific things to work on next.
- "recommended_teacher_id": the id of the best teacher for them from the list below.
- "recommendation_reason": one short sentence explaining that choice.
- "answer_feedback": exactly one item per learner answer in the conversation, in order. Each item is
  {"improved": the answer rewritten in natural, correct English one step above their level, keeping their meaning,
  "tip": one short tip about the most useful fix, or "" if the answer was already excellent}.
- "plan": exactly 3 study steps, most important first. Each is {"title": a short name,
  "detail": one sentence on what to do, "teacher_id": the best teacher id for it,
  "practice_prompt": the first message the learner could send that teacher to practise it, written by the learner in first person}.

Teachers:
{teachers}

Respond with JSON only."""

CHECK_PROMPT = """You are a careful English examiner checking gap-fill questions before learners see them.
For each question:
1. Try every option in the gap and read the whole sentence aloud in your head.
2. List EVERY option that gives a fully correct, natural sentence in standard English. If two options both work, list both.
3. Write out the sentence completed with the best option, exactly as it would read.
4. Decide if that completed sentence is clear, natural and well written: something a published textbook would print.
   Awkward or ambiguous sentences (for example a pronoun with no clear meaning, or a structure no option can fix)
   do not count.

Return a JSON object: {"checks": [{"index": number, "correct": [indexes of every option that works],
"completed": "the full sentence with the best option", "makes_sense": true or false}]}.
Include every question. Respond with JSON only."""

DEFAULT_TOPICS = [
    "Travel",
    "Food",
    "Movies & music",
    "Work & study",
    "Sports",
    "Technology",
    "Family & friends",
    "Nature",
]

DEFAULT_CONFIG = LevelTestConfig(
    enabled=True,
    topics=DEFAULT_TOPICS,
    quiz_enabled=True,
    quiz_count=8,
    question_count=5,
    examiner_prompt=EXAMINER_PROMPT,
    grading_prompt=GRADING_PROMPT,
)


class GradingError(Exception):
    pass


async def get_config() -> LevelTestConfig:
    doc = await db.settings.find_one({"_id": CONFIG_ID}) or {}
    return LevelTestConfig(
        **{
            **DEFAULT_CONFIG.model_dump(),
            **{k: v for k, v in doc.items() if k != "_id"},
        }
    )


async def save_config(config: LevelTestConfig) -> LevelTestConfig:
    await db.settings.update_one({"_id": CONFIG_ID}, {"$set": config.model_dump()}, upsert=True)
    return config


def _fill(template: str, values: dict[str, str]) -> str:
    for key, value in values.items():
        template = template.replace("{" + key + "}", value)
    return template


# Quick check


def _valid_question(item: object) -> dict | None:
    if not isinstance(item, dict):
        return None
    options = [" ".join(str(o).split()) for o in item.get("options", []) if str(o).strip()]
    level, skill, question = (
        item.get("level"),
        item.get("skill"),
        " ".join(str(item.get("question", "")).split()),
    )
    answer = item.get("answer_index")
    if (
        level not in LEVELS
        or skill not in ("grammar", "vocabulary")
        or "___" not in question
        or len(options) != 4
        or len({o.lower() for o in options}) != 4
        or not isinstance(answer, int)
        or not 0 <= answer <= 3
    ):
        return None
    correct = options[answer]
    random.shuffle(options)
    return {
        "level": level,
        "skill": skill,
        "question": question,
        "options": options,
        "answer_index": options.index(correct),
    }


def _confirmed(review: str, items: list[dict]) -> set[int]:
    confirmed: set[int] = set()
    try:
        checks = json.loads(review or "{}").get("checks", [])
    except json.JSONDecodeError:
        return confirmed
    for check in checks:
        try:
            index, correct = int(check["index"]), {int(c) for c in check.get("correct", [])}
        except (KeyError, TypeError, ValueError):
            continue
        if 0 <= index < len(items) and check.get("makes_sense") is True and correct == {items[index]["answer_index"]}:
            confirmed.add(index)
    return confirmed


async def _with_retry(call):
    for attempt in range(RATE_LIMIT_RETRIES + 1):
        try:
            return await call()
        except groq.RateLimitError:
            if attempt == RATE_LIMIT_RETRIES:
                raise
            await asyncio.sleep(RATE_LIMIT_WAIT * (attempt + 1))


async def _generate_batch() -> int:
    total = QUIZ_PER_LEVEL * len(LEVELS)
    raw = await _with_retry(
        lambda: complete(
            _fill(QUIZ_PROMPT, {"per_level": str(QUIZ_PER_LEVEL), "total": str(total)}),
            [{"role": "user", "content": "Write the placement questions."}],
            temperature=0.8,
            max_tokens=4000,
            json_mode=True,
        )
    )
    items = [q for q in (_valid_question(i) for i in json.loads(raw or "{}").get("questions", [])) if q]
    if not items:
        return 0
    listing = [{"index": i, "question": q["question"], "options": q["options"]} for i, q in enumerate(items)]
    confirmed = set(range(len(items)))
    for _ in range(REVIEWERS):
        review = await _with_retry(
            lambda: complete(
                CHECK_PROMPT,
                [{"role": "user", "content": json.dumps(listing)}],
                temperature=0.6,
                max_tokens=6000,
                json_mode=True,
            )
        )
        confirmed &= _confirmed(review, items)
        if not confirmed:
            break
    flawed = set(range(len(items))) - confirmed
    existing = set(await db.quiz_questions.distinct("question"))
    good = [
        {**q, "created_at": now()} for i, q in enumerate(items) if i not in flawed and q["question"] not in existing
    ]
    if good:
        await db.quiz_questions.insert_many(good)
    logger.info(
        "Added %d of %d generated quiz questions (%d flagged)",
        len(good),
        len(items),
        len(flawed),
    )
    return len(good)


async def pool_counts() -> dict[str, int]:
    counts = {level: 0 for level in LEVELS}
    for row in await (await db.quiz_questions.aggregate([{"$group": {"_id": "$level", "n": {"$sum": 1}}}])).to_list():
        if row["_id"] in counts:
            counts[row["_id"]] = row["n"]
    return counts


async def generate_more(batches: int = 1) -> None:
    if _refill["running"]:
        return
    _refill["running"] = True
    try:
        for i in range(batches):
            if i:
                await asyncio.sleep(BATCH_PAUSE)
            await _generate_batch()
    except (
        groq.GroqError,
        json.JSONDecodeError,
        AttributeError,
        TypeError,
        ValueError,
    ) as exc:
        logger.warning("Generating quiz questions failed: %s", exc)
    finally:
        _refill["running"] = False


def refilling() -> bool:
    return _refill["running"]


async def _sample(level: str, exclude: list[ObjectId], size: int) -> list[dict]:
    match: dict = {"level": level}
    if exclude:
        match["_id"] = {"$nin": exclude}
    return await (await db.quiz_questions.aggregate([{"$match": match}, {"$sample": {"size": size}}])).to_list()


async def build_quiz(user_id: ObjectId, count: int) -> dict | None:
    seen = [
        ObjectId(q["id"])
        async for t in db.level_tests.find({"user_id": user_id, "quiz": {"$exists": True}}, {"quiz.bank.id": 1})
        for q in t["quiz"]["bank"]
        if ObjectId.is_valid(q["id"])
    ]
    if min((await pool_counts()).values()) < MIN_PER_LEVEL:
        return None
    bank: list[dict] = []
    for level in LEVELS:
        picked = await _sample(level, seen, PER_LEVEL_IN_TEST)
        if len(picked) < MIN_PER_LEVEL:
            picked = await _sample(level, [], PER_LEVEL_IN_TEST)
        bank += picked
    if len({q["level"] for q in bank}) < len(LEVELS) - 1 or len(bank) < count:
        return None
    bank = [
        {k: q[k] for k in ("level", "skill", "question", "options", "answer_index")} | {"id": str(q["_id"])}
        for q in bank
    ]
    quiz = {
        "bank": bank,
        "asked": [],
        "total": count,
        "step": QUIZ_START,
        "current": None,
        "last": None,
    }
    _next(quiz)
    return quiz


def _pick(quiz: dict) -> str | None:
    used = {a["id"] for a in quiz["asked"]}
    last_skill = quiz.get("last_skill")
    for distance in range(len(LEVELS)):
        for index in {quiz["step"] - distance, quiz["step"] + distance}:
            if not 0 <= index < len(LEVELS):
                continue
            options = [q for q in quiz["bank"] if q["level"] == LEVELS[index] and q["id"] not in used]
            if options:
                options.sort(key=lambda q: q["skill"] == last_skill)
                quiz["last_skill"] = options[0]["skill"]
                return options[0]["id"]
    return None


def _next(quiz: dict) -> None:
    quiz["current"] = _pick(quiz) if len(quiz["asked"]) < quiz["total"] else None
    quiz["format"] = FORMATS[len(quiz["asked"]) % len(FORMATS)]
    quiz["shown"] = None
    if quiz["current"] and quiz["format"] == "judge":
        item = next(q for q in quiz["bank"] if q["id"] == quiz["current"])
        right = random.random() < 0.5
        wrong = [i for i in range(len(item["options"])) if i != item["answer_index"]]
        quiz["shown"] = item["answer_index"] if right else random.choice(wrong)


def answer_quiz(quiz: dict, choice: int) -> None:
    item = next(q for q in quiz["bank"] if q["id"] == quiz["current"])
    fmt = quiz.get("format", "fill")
    if fmt == "judge":
        says_right = choice == 0
        correct = says_right == (quiz["shown"] == item["answer_index"])
    else:
        correct = choice == item["answer_index"]
    quiz["asked"].append(
        {
            "id": item["id"],
            "chosen": choice,
            "correct": correct,
            "format": fmt,
            "shown": quiz.get("shown"),
        }
    )
    quiz["last"] = {
        "correct": correct,
        "answer": item["options"][item["answer_index"]],
        "sentence": item["question"].replace("___", item["options"][item["answer_index"]]),
    }
    quiz["step"] = min(len(LEVELS) - 1, quiz["step"] + 1) if correct else max(0, quiz["step"] - 1)
    _next(quiz)


def quiz_level(quiz: dict | None) -> str | None:
    if not quiz or not quiz.get("asked"):
        return None
    bank = {q["id"]: q for q in quiz["bank"]}
    tail = quiz["asked"][len(quiz["asked"]) // 2 :]
    scores = []
    for a in tail:
        index = LEVELS.index(bank[a["id"]]["level"])
        scores.append(index if a["correct"] else index - 1)
    return LEVELS[max(0, min(len(LEVELS) - 1, round(sum(scores) / len(scores))))]


def _quiz_summary(quiz: dict | None) -> str:
    if not quiz or not quiz.get("asked"):
        return "Part 1 (quick check): not taken."
    bank = {q["id"]: q for q in quiz["bank"]}
    lines = [
        f"- {bank[a['id']]['level']} {bank[a['id']]['skill']} ({a.get('format', 'fill')}): "
        f"{'correct' if a['correct'] else 'wrong'}"
        for a in quiz["asked"]
    ]
    correct = sum(a["correct"] for a in quiz["asked"])
    return (
        f"Part 1 (quick check): {correct} of {len(quiz['asked'])} correct, "
        f"adaptive estimate {quiz_level(quiz)}.\n" + "\n".join(lines)
    )


# Conversation


async def next_question(test: dict, config: LevelTestConfig, name: str) -> str:
    app_name = (await get_app_settings())["app_name"]
    number = sum(1 for m in test["messages"] if m["role"] == "learner") + 1
    estimate = quiz_level(test.get("quiz"))
    start = f"the quick check suggests about {estimate}" if estimate else "unknown, so start easy"
    system = _fill(
        config.examiner_prompt,
        {
            "app": app_name,
            "name": name.split(" ")[0],
            "count": str(test["question_count"]),
            "number": str(number),
            "start_level": start,
            "topic": test.get("topic") or "anything they enjoy",
        },
    )
    history = [
        {
            "role": "assistant" if m["role"] == "examiner" else "user",
            "content": m["content"],
        }
        for m in test["messages"]
    ]
    if not history:
        history = [{"role": "user", "content": "I'm ready to start."}]
    text = await complete(system, history, temperature=0.6, max_tokens=600)
    return text.strip() or "Could you tell me a little about yourself?"


def _transcript(messages: list[dict]) -> str:
    lines = []
    for m in messages:
        if m["role"] == "examiner":
            lines.append(f"Examiner: {m['content'][:1000]}")
        else:
            spoken = " (spoken)" if m.get("mode") == "voice" else ""
            lines.append(f"Learner{spoken}: {m['content'][:2000]}")
    return "\n".join(lines)


# Grading


def _pick_teacher(level: str, teachers: list[dict]) -> str | None:
    index = LEVELS.index(level)
    wanted = "Beginner" if index <= 1 else "Advanced" if index >= 3 else "Intermediate"
    for t in teachers:
        if t.get("level") in (wanted, "All levels"):
            return t["_id"]
    return teachers[0]["_id"] if teachers else None


async def grade(test: dict, config: LevelTestConfig) -> LevelResult:
    teachers = await db.teachers.find({"enabled": True}).sort("order", 1).to_list()
    ids = {t["_id"] for t in teachers}
    listing = "\n".join(
        f"- {t['_id']}: {t['name']}, {t.get('specialty', '')} ({t.get('level', 'All levels')})" for t in teachers
    )
    system = f"{config.grading_prompt}\n\n{_fill(OUTPUT_FORMAT, {'teachers': listing or '- none'})}"
    prompt = (
        f"{_quiz_summary(test.get('quiz'))}\n\n"
        f"Part 2 (conversation):\n{_transcript(test['messages'])}\n\n"
        "Assess the learner and return JSON."
    )
    last_error: Exception | None = None
    for _ in range(2):
        try:
            raw = await complete(
                system,
                [{"role": "user", "content": prompt}],
                temperature=0.1,
                max_tokens=4000,
                json_mode=True,
            )
            result = LevelResult(**json.loads(raw or "{}"))
        except (json.JSONDecodeError, ValidationError, TypeError) as exc:
            last_error = exc
            continue
        if result.recommended_teacher_id not in ids:
            result.recommended_teacher_id = _pick_teacher(result.level, teachers)
        for step in result.plan:
            if step.teacher_id not in ids:
                step.teacher_id = result.recommended_teacher_id
        quiz = test.get("quiz")
        if quiz and quiz.get("asked"):
            result.quiz_correct = sum(a["correct"] for a in quiz["asked"])
            result.quiz_total = len(quiz["asked"])
            result.quiz_level = quiz_level(quiz)
        return result
    logger.warning("Grading failed for test %s: %s", test["_id"], last_error)
    raise GradingError("We couldn't grade your test. Please try again.")
