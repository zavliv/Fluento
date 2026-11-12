from datetime import timedelta

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, HTTPException, Query

from app.db import db, now
from app.schemas.mistakes import (
    CategoryCount,
    Category,
    MistakeOut,
    MistakeSummary,
    MistakeUpdate,
    RuleCount,
    mistake_out,
)
from app.security import current_user
from app.services.app_settings import get_app_settings

router = APIRouter(prefix="/me/mistakes", tags=["mistakes"])


def _mistake_id(value: str) -> ObjectId:
    try:
        return ObjectId(value)
    except InvalidId as exc:
        raise HTTPException(status_code=404, detail="Mistake not found.") from exc


async def mistake_summary(user_id: ObjectId) -> MistakeSummary:
    open_only = {"user_id": user_id, "mastered": False}
    categories = await (
        await db.mistakes.aggregate(
            [{"$match": open_only}, {"$group": {"_id": "$category", "count": {"$sum": 1}}}, {"$sort": {"count": -1}}]
        )
    ).to_list()
    rules = await (
        await db.mistakes.aggregate(
            [
                {"$match": open_only},
                {"$sort": {"created_at": -1}},
                {
                    "$group": {
                        "_id": {"$toLower": "$rule"},
                        "rule": {"$first": "$rule"},
                        "category": {"$first": "$category"},
                        "original": {"$first": "$original"},
                        "correction": {"$first": "$correction"},
                        "count": {"$sum": 1},
                    }
                },
                {"$sort": {"count": -1, "rule": 1}},
                {"$limit": 5},
            ]
        )
    ).to_list()
    total = await db.mistakes.count_documents({"user_id": user_id})
    mastered = await db.mistakes.count_documents({"user_id": user_id, "mastered": True})
    return MistakeSummary(
        enabled=(await get_app_settings())["mistakes_enabled"],
        total=total,
        open=total - mastered,
        mastered=mastered,
        this_week=await db.mistakes.count_documents(
            {"user_id": user_id, "created_at": {"$gte": now() - timedelta(days=7)}}
        ),
        categories=[CategoryCount(category=c["_id"], count=c["count"]) for c in categories],
        top_rules=[RuleCount(**{k: v for k, v in r.items() if k != "_id"}) for r in rules],
    )


@router.get("")
async def list_mistakes(
    status: str = Query("open", pattern="^(open|mastered|all)$"),
    category: Category | None = None,
    user: dict = Depends(current_user),
) -> list[MistakeOut]:
    query: dict = {"user_id": user["_id"]}
    if status != "all":
        query["mastered"] = status == "mastered"
    if category:
        query["category"] = category
    docs = await db.mistakes.find(query).sort("created_at", -1).limit(200).to_list()
    return [mistake_out(d) for d in docs]


@router.get("/summary")
async def summary(user: dict = Depends(current_user)) -> MistakeSummary:
    return await mistake_summary(user["_id"])


@router.patch("/{mistake_id}")
async def update_mistake(mistake_id: str, body: MistakeUpdate, user: dict = Depends(current_user)) -> MistakeOut:
    doc = await db.mistakes.find_one_and_update(
        {"_id": _mistake_id(mistake_id), "user_id": user["_id"]},
        {"$set": {"mastered": body.mastered}},
        return_document=True,
    )
    if doc is None:
        raise HTTPException(status_code=404, detail="Mistake not found.")
    return mistake_out(doc)


@router.delete("/{mistake_id}")
async def delete_mistake(mistake_id: str, user: dict = Depends(current_user)) -> dict:
    result = await db.mistakes.delete_one({"_id": _mistake_id(mistake_id), "user_id": user["_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Mistake not found.")
    return {"ok": True}
