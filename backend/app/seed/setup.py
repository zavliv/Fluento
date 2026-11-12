import logging

from app.config import settings
from app.db import db, ensure_indexes, now
from app.security import hash_password
from app.seed.rules import RULE_SECTIONS
from app.seed.teachers import TEACHERS
from app.services.app_settings import DEFAULTS, SETTINGS_ID

logger = logging.getLogger("fluento")


async def setup_database() -> None:
    await ensure_indexes()

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

    await db.settings.update_one({"_id": SETTINGS_ID}, {"$setOnInsert": DEFAULTS}, upsert=True)

    if settings.admin_email and settings.admin_password:
        email = settings.admin_email.strip().lower()
        if await db.users.find_one({"email": email}) is None:
            await db.users.insert_one(
                {
                    "name": settings.admin_name,
                    "email": email,
                    "password_hash": hash_password(settings.admin_password.get_secret_value()),
                    "role": "admin",
                    "teacher_ids": [],
                    "created_at": now(),
                }
            )
            logger.info("Created admin user %s", email)
