import logging
import random

from app.config import settings
from app.db import db, ensure_indexes, now
from app.security import hash_password
from app.seed.legacy import RULE_UPDATES
from app.seed.quiz import QUIZ_QUESTIONS
from app.seed.rules import RULE_SECTIONS
from app.seed.teachers import TEACHERS
from app.services.app_settings import DEFAULTS, SETTINGS_ID

logger = logging.getLogger("fluento")

QUIZ_SEED_VERSION = 1


async def setup_database() -> None:
    await ensure_indexes()
    await db.teachers.update_many({"online": {"$exists": False}}, {"$set": {"online": True}})

    if await db.teachers.count_documents({}) == 0:
        await db.teachers.insert_many(
            [
                {"_id": t["id"], **{k: v for k, v in t.items() if k != "id"}, "created_at": now(), "updated_at": now()}
                for t in TEACHERS
            ]
        )
        logger.info("Seeded %d teachers", len(TEACHERS))

    if await db.rules.count_documents({}) == 0:
        await db.rules.insert_many(
            [{"_id": r["id"], **{k: v for k, v in r.items() if k != "id"}, "updated_at": now()} for r in RULE_SECTIONS]
        )
        logger.info("Seeded %d rule sections", len(RULE_SECTIONS))

    await _update_legacy_rules()
    await _add_focus_rules()

    await db.settings.update_one({"_id": SETTINGS_ID}, {"$setOnInsert": DEFAULTS}, upsert=True)

    await seed_quiz()
    await _move_admins_out_of_users()

    if settings.admin_email and settings.admin_password and await db.admins.count_documents({}) == 0:
        email = settings.admin_email.strip().lower()
        await db.admins.insert_one(
            {
                "name": settings.admin_name,
                "email": email,
                "password_hash": hash_password(settings.admin_password.get_secret_value()),
                "role": "owner",
                "created_at": now(),
            }
        )
        logger.info("Created owner account %s", email)


async def _move_admins_out_of_users() -> None:
    async for user in db.users.find({"role": "admin"}):
        if await db.admins.find_one({"email": user["email"]}) is None:
            await db.admins.insert_one(
                {
                    "name": user["name"],
                    "email": user["email"],
                    "password_hash": user["password_hash"],
                    "role": "owner",
                    "created_at": user["created_at"],
                    "last_seen_at": user.get("last_seen_at"),
                }
            )
        await db.conversations.delete_many({"user_id": user["_id"]})
        await db.users.delete_one({"_id": user["_id"]})
        logger.info("Moved admin %s to the admins collection", user["email"])
    await db.users.update_many({"role": {"$exists": True}}, {"$unset": {"role": ""}})


async def _update_legacy_rules() -> None:
    async for section in db.rules.find({"rules": {"$in": list(RULE_UPDATES)}}):
        rules = [RULE_UPDATES.get(rule, rule) for rule in section["rules"]]
        await db.rules.update_one({"_id": section["_id"]}, {"$set": {"rules": rules}})
        logger.info("Updated rule placeholders in section %s", section["_id"])


async def seed_quiz() -> None:
    if await db.settings.find_one({"_id": "quiz_seed", "version": QUIZ_SEED_VERSION}):
        return
    existing = set(await db.quiz_questions.distinct("question"))
    docs = []
    for level, skill, question, options in QUIZ_QUESTIONS:
        if question in existing:
            continue
        shuffled = random.sample(options, len(options))
        docs.append(
            {
                "level": level,
                "skill": skill,
                "question": question,
                "options": shuffled,
                "answer_index": shuffled.index(options[0]),
                "source": "starter",
                "created_at": now(),
            }
        )
    if docs:
        await db.quiz_questions.insert_many(docs)
    await db.settings.update_one({"_id": "quiz_seed"}, {"$set": {"version": QUIZ_SEED_VERSION}}, upsert=True)
    logger.info("Seeded %d starter quiz questions", len(docs))


async def _add_focus_rules() -> None:
    done = await db.settings.find_one({"_id": "migrations", "focus_rules": True})
    if done:
        return
    section = next(r for r in RULE_SECTIONS if r["id"] == "focus")
    await db.rules.update_one(
        {"_id": "focus"},
        {"$setOnInsert": {**{k: v for k, v in section.items() if k != "id"}, "updated_at": now()}},
        upsert=True,
    )
    await db.settings.update_one({"_id": "migrations"}, {"$set": {"focus_rules": True}}, upsert=True)
