import groq
from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, HTTPException

from app.db import db, now
from app.schemas.level_test import (
    AnswerRequest,
    LevelTestOut,
    LevelTestPublicConfig,
    LevelTestState,
    QuizAnswerRequest,
    StartRequest,
    history_item,
    level_test_out,
)
from app.security import current_user
from app.services.level_test import GradingError, answer_quiz, build_quiz, get_config, grade, next_question
from app.services.llm import error_message
from app.services.progress import record_level_check

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


async def _ask(test: dict, user: dict) -> None:
    try:
        question = await next_question(test, await get_config(), user["name"])
    except groq.GroqError as exc:
        raise _llm_error(exc) from exc
    test["messages"].append({"role": "examiner", "content": question})


async def _finish(test: dict, user: dict) -> dict:
    try:
        result = await grade(test, await get_config())
    except GradingError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except groq.GroqError as exc:
        raise _llm_error(exc) from exc
    finished = now()
    test.update(status="completed", phase="done", result=result.model_dump(), completed_at=finished)
    await db.level_tests.update_one(
        {"_id": test["_id"]},
        {"$set": {"status": "completed", "phase": "done", "result": test["result"], "completed_at": finished}},
    )
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"level": {"level": result.level, "test_id": test["_id"], "tested_at": finished}}},
    )
    await record_level_check(user["_id"], result.level, (user.get("level") or {}).get("level"))
    return test


@router.get("")
async def state(user: dict = Depends(current_user)) -> LevelTestState:
    config = await get_config()
    current = await db.level_tests.find_one(
        {"user_id": user["_id"], "status": "in_progress"}, sort=[("created_at", -1)]
    )
    done = (
        await db.level_tests.find({"user_id": user["_id"], "status": "completed"})
        .sort("completed_at", -1)
        .limit(20)
        .to_list()
    )
    return LevelTestState(
        config=LevelTestPublicConfig(
            enabled=config.enabled,
            topics=config.topics,
            quiz_enabled=config.quiz_enabled,
            quiz_count=config.quiz_count,
            question_count=config.question_count,
        ),
        current=level_test_out(current) if current else None,
        latest=level_test_out(done[0]) if done else None,
        previous=history_item(done[1]) if len(done) > 1 else None,
        history=[history_item(d) for d in reversed(done)],
    )


@router.post("", status_code=201)
async def start(body: StartRequest | None = None, user: dict = Depends(current_user)) -> LevelTestOut:
    config = await get_config()
    if not config.enabled:
        raise HTTPException(status_code=403, detail="The level test is turned off right now.")
    await db.level_tests.delete_many({"user_id": user["_id"], "status": "in_progress"})
    test = {
        "user_id": user["_id"],
        "status": "in_progress",
        "phase": "chat",
        "question_count": config.question_count,
        "messages": [],
        "topic": " ".join((body.topic or "").split())[:60] if body else "",
        "created_at": now(),
    }
    if config.quiz_enabled:
        try:
            quiz = await build_quiz(user["_id"], config.quiz_count)
        except groq.GroqError as exc:
            raise _llm_error(exc) from exc
        if quiz:
            test.update(phase="quiz", quiz=quiz)
    if test["phase"] == "chat":
        await _ask(test, user)
    test["_id"] = (await db.level_tests.insert_one(test)).inserted_id
    return level_test_out(test)


@router.post("/{test_id}/quiz")
async def quiz(test_id: str, body: QuizAnswerRequest, user: dict = Depends(current_user)) -> LevelTestOut:
    test = await _own_test(test_id, user)
    if test["status"] != "in_progress" or test.get("phase") != "quiz" or not test["quiz"].get("current"):
        raise HTTPException(status_code=400, detail="The quick check is already finished.")
    answer_quiz(test["quiz"], body.choice)
    if test["quiz"]["current"] is None:
        test["phase"] = "chat"
        await _ask(test, user)
    await db.level_tests.update_one(
        {"_id": test["_id"]}, {"$set": {"quiz": test["quiz"], "phase": test["phase"], "messages": test["messages"]}}
    )
    return level_test_out(test)


@router.post("/{test_id}/answer")
async def answer(test_id: str, body: AnswerRequest, user: dict = Depends(current_user)) -> LevelTestOut:
    test = await _own_test(test_id, user)
    if test["status"] != "in_progress" or test.get("phase", "chat") != "chat":
        raise HTTPException(status_code=400, detail="This part of the test isn't open.")
    answered = sum(1 for m in test["messages"] if m["role"] == "learner")
    if answered >= test["question_count"]:
        return level_test_out(await _finish(test, user))

    test["messages"].append({"role": "learner", "content": body.text.strip(), "mode": body.mode})
    if answered + 1 < test["question_count"]:
        await _ask(test, user)
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
