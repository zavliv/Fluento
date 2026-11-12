import json
import logging
import random
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from bson import ObjectId
from pydantic import BaseModel, Field

from app.db import db, now
from app.schemas.level_test import LEVELS
from app.services.llm import complete

logger = logging.getLogger("fluento.progress")

CONFIG_ID = "progress"
LEVEL_FLOOR = {"A1": 0, "A2": 800, "B1": 1000, "B2": 1200, "C1": 1400, "C2": 1600}
LEVEL_RATING = {"A1": 700, "A2": 900, "B1": 1100, "B2": 1300, "C1": 1500, "C2": 1700}
START_RATING = 1000
CONFIDENT_AFTER = 30
CALENDAR_DAYS = 56
FORMATS = ("fill", "listen", "judge")

SPEAKING_PROMPTS = {
    "A1": [
        "What do you usually eat for breakfast?",
        "Tell me about your family.",
        "What is your favourite colour, and why?",
    ],
    "A2": [
        "What did you do last weekend?",
        "Describe your home in a few sentences.",
        "What do you like doing after work or school?",
    ],
    "B1": [
        "Tell me about a trip you really enjoyed.",
        "What are your plans for next year?",
        "Describe a person who has influenced you.",
    ],
    "B2": [
        "Do you think social media does more good than harm? Why?",
        "What would you change about your city if you could?",
        "Describe a challenge you overcame and what you learned.",
    ],
    "C1": [
        "Should governments limit working hours? Give reasons for your view.",
        "How might artificial intelligence change education in the next ten years?",
        "Describe a time you had to persuade someone, and how you did it.",
    ],
    "C2": [
        "Is it ever right to break an unfair rule? Argue your position.",
        "To what extent does language shape the way we think?",
        "What does success mean to you, and has that changed over time?",
    ],
}

SPEAKING_GRADER = """You grade one short answer from an English learner. The learner's current level is about {level}.
Return a JSON object with exactly these keys:
- "score": 0-100 for how well the answer uses English at or above {level} (grammar, vocabulary, fluency, relevance).
- "feedback": one short, friendly sentence on the most useful thing to improve, in "you" form.
- "improved": the learner's answer rewritten in natural, correct English, keeping their meaning.
Very short, off-topic or non-English answers score low. Answers marked spoken were transcribed, so ignore punctuation.
Respond with JSON only."""

BADGES = {
    "first_challenge": ("First step", "Finished your first challenge"),
    "streak_3": ("On a roll", "3-day streak"),
    "streak_7": ("One week strong", "7-day streak"),
    "streak_30": ("Unstoppable", "30-day streak"),
    "perfect": ("Perfect round", "Got every round right in a challenge"),
    "first_check": ("Level certified", "Finished your first level check"),
    "level_up": ("Level up", "Moved up a CEFR level"),
    "xp_1000": ("1,000 XP", "Earned 1,000 XP in total"),
    "league_top3": ("Podium", "Finished a week in the league top 3"),
}


class ProgressConfig(BaseModel):
    enabled: bool = True
    daily_goal_xp: int = Field(default=50, ge=10, le=500)
    placement_rounds: int = Field(default=8, ge=4, le=12)
    daily_rounds: int = Field(default=5, ge=3, le=10)
    xp_correct: int = Field(default=10, ge=0, le=100)
    xp_hard_bonus: int = Field(default=5, ge=0, le=100)
    xp_spoken: int = Field(default=20, ge=0, le=200)
    xp_level_check: int = Field(default=50, ge=0, le=500)
    freeze_every_days: int = Field(default=7, ge=2, le=60)
    max_freezes: int = Field(default=2, ge=0, le=10)
    check_every_days: int = Field(default=7, ge=1, le=60)
    league_enabled: bool = True
    speaking_model: str = "openai/gpt-oss-20b"


async def get_config() -> ProgressConfig:
    doc = await db.settings.find_one({"_id": CONFIG_ID}) or {}
    return ProgressConfig(**{k: v for k, v in doc.items() if k != "_id"})


async def save_config(config: ProgressConfig) -> ProgressConfig:
    await db.settings.update_one({"_id": CONFIG_ID}, {"$set": config.model_dump()}, upsert=True)
    return config


# Time


def zone(name: str | None) -> ZoneInfo:
    try:
        return ZoneInfo(name or "UTC")
    except (ZoneInfoNotFoundError, ValueError):
        return ZoneInfo("UTC")


def local_day(tz: str | None, at: datetime | None = None) -> date:
    return (at or now()).astimezone(zone(tz)).date()


def week_key(day: date) -> str:
    monday = day - timedelta(days=day.weekday())
    return monday.isoformat()


# Rating


def level_for(rating: float) -> str:
    level = "A1"
    for name in LEVELS:
        if rating >= LEVEL_FLOOR[name]:
            level = name
    return level


def band_progress(rating: float) -> float:
    level = level_for(rating)
    index = LEVELS.index(level)
    if index == len(LEVELS) - 1:
        return min(1.0, (rating - LEVEL_FLOOR[level]) / 200)
    low, high = LEVEL_FLOOR[level], LEVEL_FLOOR[LEVELS[index + 1]]
    return max(0.0, min(1.0, (rating - low) / (high - low)))


def expected(player: float, question: float) -> float:
    return 1 / (1 + 10 ** ((question - player) / 400))


def k_factor(answers: int, placement: bool) -> float:
    if placement:
        return 96
    return 28 if answers < 40 else 18


def question_rating(question: dict) -> float:
    return float(question.get("rating") or LEVEL_RATING[question["level"]])


# Progress documents


def blank_progress(user_id: ObjectId, tz: str | None) -> dict:
    return {
        "_id": user_id,
        "tz": tz or "UTC",
        "rating": START_RATING,
        "answers": 0,
        "placed": False,
        "xp_total": 0,
        "xp_week": 0,
        "week": None,
        "today": {"day": None, "xp": 0, "challenges": 0},
        "streak": {"current": 0, "best": 0, "last_day": None, "freezes": 0, "freeze_progress": 0},
        "history": {},
        "badges": [],
        "league": {"opt_in": False, "best_rank": None},
        "created_at": now(),
    }


async def load_progress(user_id: ObjectId, tz: str | None = None) -> dict:
    doc = await db.progress.find_one({"_id": user_id})
    if doc is None:
        doc = blank_progress(user_id, tz)
        await db.progress.insert_one(doc)
    elif tz and doc.get("tz") != tz:
        doc["tz"] = tz
        await db.progress.update_one({"_id": user_id}, {"$set": {"tz": tz}})
    return doc


def roll_over(progress: dict) -> None:
    today = local_day(progress["tz"])
    if progress["today"].get("day") != today.isoformat():
        progress["today"] = {"day": today.isoformat(), "xp": 0, "challenges": 0}
    if progress.get("week") != week_key(today):
        progress["week"] = week_key(today)
        progress["xp_week"] = 0
    streak = progress["streak"]
    if streak["current"] and streak["last_day"]:
        last = date.fromisoformat(streak["last_day"])
        missed = (today - last).days - 1
        if missed > 0:
            if missed <= streak["freezes"]:
                streak["freezes"] -= missed
                streak["last_day"] = (today - timedelta(days=1)).isoformat()
                streak["used_freeze"] = today.isoformat()
            else:
                streak["current"] = 0
                streak["freeze_progress"] = 0


def streak_alive(progress: dict) -> bool:
    return progress["streak"]["current"] > 0 and progress["streak"]["last_day"] == progress["today"]["day"]


def add_xp(progress: dict, amount: int) -> None:
    progress["xp_total"] += amount
    progress["xp_week"] += amount
    progress["today"]["xp"] += amount
    day = progress["today"]["day"]
    progress["history"][day] = progress["history"].get(day, 0) + amount


def count_day(progress: dict, config: ProgressConfig) -> bool:
    streak = progress["streak"]
    today = progress["today"]["day"]
    progress["today"]["challenges"] += 1
    if streak["last_day"] == today:
        return False
    streak["current"] += 1
    streak["best"] = max(streak["best"], streak["current"])
    streak["last_day"] = today
    streak["freeze_progress"] += 1
    if streak["freeze_progress"] >= config.freeze_every_days:
        streak["freeze_progress"] = 0
        streak["freezes"] = min(config.max_freezes, streak["freezes"] + 1)
    return True


def award_badges(progress: dict, events: set[str]) -> list[str]:
    have = {b["id"] for b in progress["badges"]}
    earned = set(events)
    streak = progress["streak"]["current"]
    for days in (3, 7, 30):
        if streak >= days:
            earned.add(f"streak_{days}")
    if progress["xp_total"] >= 1000:
        earned.add("xp_1000")
    new = [b for b in BADGES if b in earned and b not in have]
    progress["badges"] += [{"id": b, "earned_at": now()} for b in new]
    return new


async def save_progress(progress: dict) -> None:
    progress["history"] = dict(sorted(progress["history"].items())[-CALENDAR_DAYS * 2 :])
    await db.progress.replace_one({"_id": progress["_id"]}, progress, upsert=True)


# Challenge rounds


async def build_rounds(user_id: ObjectId, rating: float, count: int) -> dict | None:
    recent = [
        ObjectId(q["id"])
        async for c in db.challenges.find({"user_id": user_id}, {"quiz.bank.id": 1}).sort("created_at", -1).limit(20)
        for q in c.get("quiz", {}).get("bank", [])
        if ObjectId.is_valid(q["id"])
    ]
    docs = await db.quiz_questions.find({"_id": {"$nin": recent}}).to_list()
    if len(docs) < count * 2:
        docs = await db.quiz_questions.find({}).to_list()
    if len(docs) < count:
        return None
    bank = [
        {k: q[k] for k in ("level", "skill", "question", "options", "answer_index")}
        | {"id": str(q["_id"]), "rating": question_rating(q)}
        for q in docs
    ]
    quiz = {"bank": bank, "asked": [], "total": count, "rating": rating, "current": None, "last": None}
    next_round(quiz)
    return quiz


def pick(quiz: dict) -> str | None:
    used = {a["id"] for a in quiz["asked"]}
    target = quiz["rating"] + random.uniform(-60, 90)
    options = [q for q in quiz["bank"] if q["id"] not in used]
    if not options:
        return None
    last_skill = quiz.get("last_skill")
    options.sort(key=lambda q: (abs(q["rating"] - target), q["skill"] == last_skill))
    choice = random.choice(options[:3])
    quiz["last_skill"] = choice["skill"]
    return choice["id"]


def next_round(quiz: dict) -> None:
    quiz["current"] = pick(quiz) if len(quiz["asked"]) < quiz["total"] else None
    quiz["format"] = FORMATS[len(quiz["asked"]) % len(FORMATS)]
    quiz["step"] = LEVELS.index(level_for(quiz["rating"]))
    quiz["shown"] = None
    if quiz["current"] and quiz["format"] == "judge":
        item = next(q for q in quiz["bank"] if q["id"] == quiz["current"])
        wrong = [i for i in range(len(item["options"])) if i != item["answer_index"]]
        quiz["shown"] = item["answer_index"] if random.random() < 0.5 else random.choice(wrong)


def answer_round(quiz: dict, choice: int, placement: bool, answers: int) -> tuple[bool, float, float]:
    item = next(q for q in quiz["bank"] if q["id"] == quiz["current"])
    fmt = quiz.get("format", "fill")
    if fmt == "judge":
        correct = (choice == 0) == (quiz["shown"] == item["answer_index"])
    else:
        correct = choice == item["answer_index"]
    before = quiz["rating"]
    chance = expected(before, item["rating"])
    quiz["rating"] = before + k_factor(answers + len(quiz["asked"]), placement) * ((1 if correct else 0) - chance)
    quiz["asked"].append(
        {"id": item["id"], "chosen": choice, "correct": correct, "format": fmt, "shown": quiz.get("shown")}
    )
    quiz["last"] = {
        "correct": correct,
        "answer": item["options"][item["answer_index"]],
        "sentence": item["question"].replace("___", item["options"][item["answer_index"]]),
    }
    next_round(quiz)
    return correct, item["rating"], chance


async def nudge_question(question_id: str, correct: bool, chance: float) -> None:
    if not ObjectId.is_valid(question_id):
        return
    doc = await db.quiz_questions.find_one({"_id": ObjectId(question_id)}, {"rating": 1, "level": 1})
    if doc:
        rating = question_rating(doc) - 6 * ((1 if correct else 0) - chance)
        await db.quiz_questions.update_one({"_id": doc["_id"]}, {"$set": {"rating": round(rating, 1)}})


def speaking_prompt(rating: float, exclude: list[str]) -> str:
    level = level_for(rating + 100)
    options = [p for p in SPEAKING_PROMPTS[level] if p not in exclude] or SPEAKING_PROMPTS[level]
    return random.choice(options)


async def grade_speaking(prompt: str, answer: str, mode: str, rating: float, model: str) -> dict:
    level = level_for(rating)
    system = SPEAKING_GRADER.replace("{level}", level)
    spoken = " (spoken)" if mode == "voice" else ""
    user = f"Question: {prompt}\nLearner's answer{spoken}: {answer[:1500]}\n\nGrade it and return JSON."
    try:
        raw = await complete(
            system, [{"role": "user", "content": user}], temperature=0.1, max_tokens=800, json_mode=True, model=model
        )
        data = json.loads(raw or "{}")
        score = max(0, min(100, int(data.get("score", 50))))
        return {
            "score": score,
            "feedback": " ".join(str(data.get("feedback", "")).split())[:300],
            "improved": " ".join(str(data.get("improved", "")).split())[:600],
        }
    except Exception as exc:
        logger.warning("Speaking grade failed: %s", exc)
        return {"score": None, "feedback": "", "improved": ""}


# League


async def league(user_id: ObjectId, week: str, limit: int = 20) -> dict:
    rows = (
        await db.progress.find({"league.opt_in": True, "week": week, "xp_week": {"$gt": 0}}, {"xp_week": 1})
        .sort("xp_week", -1)
        .limit(200)
        .to_list()
    )
    names = {
        u["_id"]: u["name"]
        for u in await db.users.find({"_id": {"$in": [r["_id"] for r in rows]}}, {"name": 1}).to_list()
    }

    def short(name: str) -> str:
        parts = name.split()
        return parts[0] if len(parts) == 1 else f"{parts[0]} {parts[-1][0]}."

    entries = [
        {"rank": i + 1, "name": short(names.get(r["_id"], "Learner")), "xp": r["xp_week"], "me": r["_id"] == user_id}
        for i, r in enumerate(rows)
    ]
    mine = next((e for e in entries if e["me"]), None)
    return {"week": week, "entries": entries[:limit], "me": mine, "total": len(entries)}


async def record_level_check(user_id: ObjectId, level: str, previous: str | None) -> None:
    config = await get_config()
    progress = await load_progress(user_id)
    roll_over(progress)
    add_xp(progress, config.xp_level_check)
    anchor = LEVEL_RATING[level]
    progress["rating"] = (progress["rating"] + anchor) / 2 if progress["placed"] else anchor
    progress["placed"] = True
    count_day(progress, config)
    events = {"first_check"}
    if previous and LEVELS.index(level) > LEVELS.index(previous):
        events.add("level_up")
    award_badges(progress, events)
    await save_progress(progress)
