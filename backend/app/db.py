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
