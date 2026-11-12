import groq
from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, HTTPException

from app.db import db, now
from app.schemas.level_test import AnswerRequest, LevelTestOut, LevelTestPublicConfig, LevelTestState, level_test_out
from app.security import current_user
from app.services.level_test import GradingError, get_config, grade, next_question
from app.services.llm import error_message

router = APIRouter(prefix="/me/level-test", tags=["level test"])


def _llm_error(exc: groq.GroqError) -> HTTPException:
    return HTTPException(status_code=502, detail=error_message(exc))


async def _own_test(test_id: str, user: dict) -> dict:
    try:
        oid = ObjectId(test_id)
    except InvalidId as exc:
        raise HTTPException(status_code=404, detail="Test not found.") from exc
    test = await db.level_tests.find_one({"_id": oid, "user_id": user["_id"]})
    if test is None:
        raise HTTPException(status_code=404, detail="Test not found.")
    return test


async def _finish(test: dict, user: dict) -> dict:
    try:
        result = await grade(test, await get_config())
    except GradingError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except groq.GroqError as exc:
        raise _llm_error(exc) from exc
    finished = now()
    test.update(status="completed", result=result.model_dump(), completed_at=finished)
    await db.level_tests.update_one(
        {"_id": test["_id"]}, {"$set": {"status": "completed", "result": test["result"], "completed_at": finished}}
    )
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"level": {"level": result.level, "test_id": test["_id"], "tested_at": finished}}},
    )
    return test


@router.get("")
async def state(user: dict = Depends(current_user)) -> LevelTestState:
    config = await get_config()
    current = await db.level_tests.find_one(
        {"user_id": user["_id"], "status": "in_progress"}, sort=[("created_at", -1)]
    )
    latest = await db.level_tests.find_one({"user_id": user["_id"], "status": "completed"}, sort=[("completed_at", -1)])
    return LevelTestState(
        config=LevelTestPublicConfig(enabled=config.enabled, question_count=config.question_count),
        current=level_test_out(current) if current else None,
        latest=level_test_out(latest) if latest else None,
    )


@router.post("", status_code=201)
async def start(user: dict = Depends(current_user)) -> LevelTestOut:
    config = await get_config()
    if not config.enabled:
        raise HTTPException(status_code=403, detail="The level test is turned off right now.")
    await db.level_tests.delete_many({"user_id": user["_id"], "status": "in_progress"})
    test = {
        "user_id": user["_id"],
        "status": "in_progress",
        "question_count": config.question_count,
        "messages": [],
        "created_at": now(),
    }
    try:
        test["messages"].append({"role": "examiner", "content": await next_question(test, config, user["name"])})
    except groq.GroqError as exc:
        raise _llm_error(exc) from exc
    test["_id"] = (await db.level_tests.insert_one(test)).inserted_id
    return level_test_out(test)


@router.post("/{test_id}/answer")
async def answer(test_id: str, body: AnswerRequest, user: dict = Depends(current_user)) -> LevelTestOut:
    test = await _own_test(test_id, user)
    if test["status"] != "in_progress":
        raise HTTPException(status_code=400, detail="This test is already finished.")
    answered = sum(1 for m in test["messages"] if m["role"] == "learner")
    if answered >= test["question_count"]:
        return level_test_out(await _finish(test, user))

    test["messages"].append({"role": "learner", "content": body.text.strip()})
    if answered + 1 < test["question_count"]:
        try:
            question = await next_question(test, await get_config(), user["name"])
        except groq.GroqError as exc:
            raise _llm_error(exc) from exc
        test["messages"].append({"role": "examiner", "content": question})
    await db.level_tests.update_one({"_id": test["_id"]}, {"$set": {"messages": test["messages"]}})

    if answered + 1 >= test["question_count"]:
        return level_test_out(await _finish(test, user))
    return level_test_out(test)


@router.post("/{test_id}/grade")
async def regrade(test_id: str, user: dict = Depends(current_user)) -> LevelTestOut:
    test = await _own_test(test_id, user)
    if test["status"] == "completed":
        return level_test_out(test)
    if sum(1 for m in test["messages"] if m["role"] == "learner") < test["question_count"]:
        raise HTTPException(status_code=400, detail="Answer all the questions first.")
    return level_test_out(await _finish(test, user))


@router.delete("/{test_id}")
async def cancel(test_id: str, user: dict = Depends(current_user)) -> dict:
    test = await _own_test(test_id, user)
    if test["status"] == "in_progress":
        await db.level_tests.delete_one({"_id": test["_id"]})
    return {"ok": True}
