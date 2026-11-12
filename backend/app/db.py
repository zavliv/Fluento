from datetime import UTC, datetime

from pymongo import ASCENDING, DESCENDING, AsyncMongoClient
from pymongo.asynchronous.database import AsyncDatabase

from app.config import settings

client: AsyncMongoClient = AsyncMongoClient(settings.mongodb_uri.get_secret_value(), tz_aware=True)
db: AsyncDatabase = client[settings.mongodb_db]


def now() -> datetime:
    return datetime.now(UTC)


async def ensure_indexes() -> None:
    await db.users.create_index("email", unique=True)
    await db.admins.create_index("email", unique=True)
    await db.teachers.create_index([("order", ASCENDING)])
    await db.rules.create_index([("order", ASCENDING)])
    await db.conversations.create_index([("user_id", ASCENDING), ("teacher_id", ASCENDING)], unique=True)
    await db.conversations.create_index([("updated_at", DESCENDING)])
    await db.mistakes.create_index([("user_id", ASCENDING), ("mastered", ASCENDING), ("created_at", DESCENDING)])
    await db.mistakes.create_index([("user_id", ASCENDING), ("message_id", ASCENDING)])
    await db.level_tests.create_index([("user_id", ASCENDING), ("status", ASCENDING), ("created_at", DESCENDING)])
    await db.level_tests.create_index([("completed_at", DESCENDING)])
    await db.quiz_questions.create_index([("level", ASCENDING)])
    await db.challenges.create_index([("user_id", ASCENDING), ("created_at", DESCENDING)])
    await db.progress.create_index([("league.opt_in", ASCENDING), ("week", ASCENDING), ("xp_week", DESCENDING)])
    await db.usage.create_index([("day", ASCENDING), ("messages", DESCENDING)])
    await db.usage.create_index("created_at", expireAfterSeconds=60 * 60 * 24 * 90)
    await db.safety_flags.create_index([("reviewed", ASCENDING), ("created_at", DESCENDING)])
    await db.safety_flags.create_index([("user_id", ASCENDING)])
