import re
from datetime import timedelta

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, HTTPException
from pymongo.errors import DuplicateKeyError

from app.agents.teacher_agent import system_prompt_for
from app.db import db, now
from app.schemas.admin import (
    AdminConversation,
    AdminConversationSummary,
    AdminUser,
    RecentConversation,
    Stats,
    TeacherUsage,
)
from app.schemas.conversations import StoredMessage
from app.schemas.memory import MemoryResponse
from app.schemas.rules import RuleSection, RuleSectionCreate, RuleSectionFields, rule_section
from app.schemas.settings import AppSettings
from app.schemas.teachers import TeacherAdmin, TeacherCreate, TeacherFields, teacher_admin
from app.security import current_admin
from app.services.app_settings import SETTINGS_ID, clear_settings_cache, get_app_settings
from app.services.memory import get_memory

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(current_admin)])


def _object_id(value: str) -> ObjectId:
    try:
        return ObjectId(value)
    except InvalidId as exc:
        raise HTTPException(status_code=404, detail="Not found.") from exc


async def _aggregate(pipeline: list[dict]) -> list[dict]:
    return await (await db.conversations.aggregate(pipeline)).to_list()


MARKDOWN = re.compile(r"[*_`#>|]+|\[([^\]]*)\]\([^)]*\)")


def _preview(messages: list[dict]) -> str:
    if not messages:
        return ""
    text = MARKDOWN.sub(lambda m: m.group(1) or "", messages[-1]["content"])
    return " ".join(text.split())[:140]


# Stats


@router.get("/stats")
async def stats() -> Stats:
    week_ago = now() - timedelta(days=7)
    totals = await _aggregate([{"$group": {"_id": None, "messages": {"$sum": {"$size": "$messages"}}}}])
    feedback = await _aggregate(
        [
            {"$unwind": "$messages"},
            {"$match": {"messages.feedback": {"$in": ["up", "down"]}}},
            {"$group": {"_id": "$messages.feedback", "count": {"$sum": 1}}},
        ]
    )
    usage = await _aggregate(
        [
            {
                "$group": {
                    "_id": "$teacher_id",
                    "conversations": {"$sum": 1},
                    "messages": {"$sum": {"$size": "$messages"}},
                }
            },
            {"$sort": {"messages": -1}},
        ]
    )
    recent_docs = (
        await db.conversations.find({}, {"messages": {"$slice": -1}}).sort("updated_at", -1).limit(6).to_list()
    )
    users = {u["_id"]: u for u in await db.users.find({"_id": {"$in": [d["user_id"] for d in recent_docs]}}).to_list()}
    counts = {f["_id"]: f["count"] for f in feedback}

    return Stats(
        learners=await db.users.count_documents({}),
        new_learners_7d=await db.users.count_documents({"created_at": {"$gte": week_ago}}),
        conversations=await db.conversations.count_documents({}),
        active_conversations_7d=await db.conversations.count_documents({"updated_at": {"$gte": week_ago}}),
        messages=totals[0]["messages"] if totals else 0,
        feedback_up=counts.get("up", 0),
        feedback_down=counts.get("down", 0),
        teacher_usage=[
            TeacherUsage(teacher_id=u["_id"], conversations=u["conversations"], messages=u["messages"]) for u in usage
        ],
        recent=[
            RecentConversation(
                id=str(d["_id"]),
                user_name=users.get(d["user_id"], {}).get("name", "Deleted user"),
                teacher_id=d["teacher_id"],
                last_message=_preview(d.get("messages", [])),
                updated_at=d["updated_at"],
            )
            for d in recent_docs
        ],
    )


# Teachers


@router.get("/teachers")
async def list_teachers() -> list[TeacherAdmin]:
    return [teacher_admin(doc) for doc in await db.teachers.find({}).sort("order", 1).to_list()]


@router.get("/teachers/{teacher_id}")
async def get_teacher(teacher_id: str) -> TeacherAdmin:
    doc = await db.teachers.find_one({"_id": teacher_id})
    if doc is None:
        raise HTTPException(status_code=404, detail="Teacher not found.")
    return teacher_admin(doc)


@router.post("/teachers", status_code=201)
async def create_teacher(body: TeacherCreate) -> TeacherAdmin:
    doc = {"_id": body.id, **body.model_dump(exclude={"id"}), "created_at": now(), "updated_at": now()}
    try:
        await db.teachers.insert_one(doc)
    except DuplicateKeyError as exc:
        raise HTTPException(status_code=409, detail="A teacher with this id already exists.") from exc
    return teacher_admin(doc)


@router.put("/teachers/{teacher_id}")
async def update_teacher(teacher_id: str, body: TeacherFields) -> TeacherAdmin:
    doc = await db.teachers.find_one_and_update(
        {"_id": teacher_id},
        {"$set": {**body.model_dump(), "updated_at": now()}},
        return_document=True,
    )
    if doc is None:
        raise HTTPException(status_code=404, detail="Teacher not found.")
    return teacher_admin(doc)


@router.delete("/teachers/{teacher_id}")
async def delete_teacher(teacher_id: str) -> dict:
    result = await db.teachers.delete_one({"_id": teacher_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Teacher not found.")
    await db.users.update_many({}, {"$pull": {"teacher_ids": teacher_id}})
    return {"ok": True}


@router.post("/teachers/preview-prompt")
async def preview_prompt(body: TeacherCreate) -> dict:
    return {"prompt": await system_prompt_for({"_id": body.id, **body.model_dump()})}


# Rules


@router.get("/rules")
async def list_rules() -> list[RuleSection]:
    return [rule_section(doc) for doc in await db.rules.find({}).sort("order", 1).to_list()]


@router.post("/rules", status_code=201)
async def create_rule_section(body: RuleSectionCreate) -> RuleSection:
    doc = {"_id": body.id, **body.model_dump(exclude={"id"}), "updated_at": now()}
    try:
        await db.rules.insert_one(doc)
    except DuplicateKeyError as exc:
        raise HTTPException(status_code=409, detail="A section with this id already exists.") from exc
    return rule_section(doc)


@router.put("/rules/{section_id}")
async def update_rule_section(section_id: str, body: RuleSectionFields) -> RuleSection:
    doc = await db.rules.find_one_and_update(
        {"_id": section_id},
        {"$set": {**body.model_dump(), "updated_at": now()}},
        return_document=True,
    )
    if doc is None:
        raise HTTPException(status_code=404, detail="Rule section not found.")
    return rule_section(doc)


@router.delete("/rules/{section_id}")
async def delete_rule_section(section_id: str) -> dict:
    if (await db.rules.delete_one({"_id": section_id})).deleted_count == 0:
        raise HTTPException(status_code=404, detail="Rule section not found.")
    return {"ok": True}


# Settings


@router.get("/settings")
async def read_settings() -> AppSettings:
    return AppSettings(**(await get_app_settings()))


@router.put("/settings")
async def write_settings(body: AppSettings) -> AppSettings:
    if await db.teachers.find_one({"_id": body.default_teacher_id}, {"_id": 1}) is None:
        raise HTTPException(status_code=400, detail="The default teacher doesn't exist.")
    await db.settings.update_one({"_id": SETTINGS_ID}, {"$set": body.model_dump()}, upsert=True)
    clear_settings_cache()
    return body


# Users


@router.get("/users")
async def list_users() -> list[AdminUser]:
    stats = {
        s["_id"]: s
        for s in await _aggregate(
            [
                {
                    "$group": {
                        "_id": "$user_id",
                        "conversations": {"$sum": 1},
                        "messages": {"$sum": {"$size": "$messages"}},
                    }
                }
            ]
        )
    }
    users = await db.users.find({}).sort("created_at", -1).to_list()
    return [
        AdminUser(
            id=str(u["_id"]),
            name=u["name"],
            email=u["email"],
            created_at=u["created_at"],
            last_seen_at=u.get("last_seen_at"),
            conversations=stats.get(u["_id"], {}).get("conversations", 0),
            messages=stats.get(u["_id"], {}).get("messages", 0),
        )
        for u in users
    ]


@router.delete("/users/{user_id}")
async def delete_user(user_id: str) -> dict:
    oid = _object_id(user_id)
    if (await db.users.delete_one({"_id": oid})).deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found.")
    await db.conversations.delete_many({"user_id": oid})
    await db.memories.delete_one({"_id": oid})
    return {"ok": True}


@router.get("/users/{user_id}/memory")
async def user_memory(user_id: str) -> MemoryResponse:
    user = await db.users.find_one({"_id": _object_id(user_id)})
    if user is None:
        raise HTTPException(status_code=404, detail="User not found.")
    return MemoryResponse(
        enabled=user.get("memory_enabled", True),
        available=(await get_app_settings())["memory_enabled"],
        memory=await get_memory(user["_id"]),
    )


# Conversations


async def _summaries(query: dict, limit: int = 100) -> list[dict]:
    docs = await db.conversations.find(query).sort("updated_at", -1).limit(limit).to_list()
    users = {u["_id"]: u for u in await db.users.find({"_id": {"$in": [d["user_id"] for d in docs]}}).to_list()}
    return [{"doc": d, "user": users.get(d["user_id"], {})} for d in docs]


def _summary(doc: dict, user: dict) -> dict:
    return {
        "id": str(doc["_id"]),
        "user_id": str(doc["user_id"]),
        "user_name": user.get("name", "Deleted user"),
        "user_email": user.get("email", ""),
        "teacher_id": doc["teacher_id"],
        "message_count": len(doc.get("messages", [])),
        "last_message": _preview(doc.get("messages", [])),
        "updated_at": doc["updated_at"],
    }


@router.get("/conversations")
async def list_conversations(
    teacher_id: str | None = None, user_id: str | None = None
) -> list[AdminConversationSummary]:
    query: dict = {}
    if teacher_id:
        query["teacher_id"] = teacher_id
    if user_id:
        query["user_id"] = _object_id(user_id)
    return [AdminConversationSummary(**_summary(item["doc"], item["user"])) for item in await _summaries(query)]


@router.get("/conversations/{conversation_id}")
async def get_conversation(conversation_id: str) -> AdminConversation:
    doc = await db.conversations.find_one({"_id": _object_id(conversation_id)})
    if doc is None:
        raise HTTPException(status_code=404, detail="Conversation not found.")
    user = await db.users.find_one({"_id": doc["user_id"]}) or {}
    return AdminConversation(
        **_summary(doc, user),
        messages=[StoredMessage(**m) for m in doc.get("messages", [])],
        created_at=doc.get("created_at"),
    )


@router.delete("/conversations/{conversation_id}")
async def delete_conversation(conversation_id: str) -> dict:
    if (await db.conversations.delete_one({"_id": _object_id(conversation_id)})).deleted_count == 0:
        raise HTTPException(status_code=404, detail="Conversation not found.")
    return {"ok": True}
