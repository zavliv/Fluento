from datetime import date, datetime, time, timedelta

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, HTTPException

from app.db import db, now
from app.schemas.level_test import LEVELS, QuizAnswerRequest, quiz_state
from app.schemas.progress import (
    Badge,
    CalendarDay,
    ChallengeOut,
    ChallengeResult,
    CheckOut,
    LeagueOut,
    LeagueUpdate,
    ProgressOut,
    SpeakingOut,
    SpeakRequest,
    StartChallenge,
    StreakOut,
    TodayOut,
    XpLine,
)
from app.security import current_user
from app.services.progress import (
    BADGES,
    CALENDAR_DAYS,
    CONFIDENT_AFTER,
    LEVEL_RATING,
    ProgressConfig,
    add_xp,
    answer_round,
    award_badges,
    band_progress,
    build_rounds,
    count_day,
    expected,
    get_config,
    grade_speaking,
    league,
    level_for,
    load_progress,
    nudge_question,
    roll_over,
    save_progress,
    speaking_prompt,
    week_key,
    zone,
)

router = APIRouter(prefix="/me", tags=["progress"])


def badge_out(badge_id: str, earned_at: datetime | None = None) -> Badge:
    name, description = BADGES[badge_id]
    return Badge(id=badge_id, name=name, description=description, earned_at=earned_at)


async def _check_status(user: dict, progress: dict, config: ProgressConfig) -> CheckOut:
    last = await db.level_tests.find_one(
        {"user_id": user["_id"], "status": "completed"},
        {"completed_at": 1, "result.level": 1},
        sort=[("completed_at", -1)],
    )
    if last is None:
        return CheckOut(available=True, reason="first")
    official = last["result"]["level"]
    next_at = last["completed_at"] + timedelta(days=config.check_every_days)
    if LEVELS.index(level_for(progress["rating"])) > LEVELS.index(official):
        return CheckOut(available=True, reason="level_up", last_at=last["completed_at"], next_at=next_at)
    if now() >= next_at:
        return CheckOut(available=True, reason="weekly", last_at=last["completed_at"], next_at=next_at)
    return CheckOut(available=False, reason="wait", last_at=last["completed_at"], next_at=next_at)


def _calendar(progress: dict) -> list[CalendarDay]:
    today = date.fromisoformat(progress["today"]["day"])
    return [
        CalendarDay(day=d, xp=progress["history"].get(d, 0))
        for d in ((today - timedelta(days=i)).isoformat() for i in range(CALENDAR_DAYS - 1, -1, -1))
    ]


async def _progress(user: dict, tz: str | None = None) -> tuple[dict, ProgressConfig]:
    config = await get_config()
    progress = await load_progress(user["_id"], tz)
    before = progress.get("week")
    roll_over(progress)
    if before and before != progress["week"]:
        await _close_week(progress, before)
    await save_progress(progress)
    return progress, config


async def _close_week(progress: dict, week: str) -> None:
    if not progress["league"].get("opt_in"):
        return
    standings = await league(progress["_id"], week, limit=3)
    if standings["me"] and standings["me"]["rank"] <= 3:
        award_badges(progress, {"league_top3"})


def _to_out(user: dict, progress: dict, config: ProgressConfig, check: CheckOut) -> ProgressOut:
    official = user.get("level") or {}
    streak = progress["streak"]
    today = progress["today"]
    return ProgressOut(
        enabled=config.enabled,
        placed=progress["placed"],
        rating=round(progress["rating"]),
        level=level_for(progress["rating"]),
        band_progress=round(band_progress(progress["rating"]), 3),
        confidence=round(min(1.0, progress["answers"] / CONFIDENT_AFTER), 2),
        official_level=official.get("level"),
        official_at=official.get("tested_at"),
        streak=StreakOut(
            current=streak["current"],
            best=streak["best"],
            freezes=streak["freezes"],
            max_freezes=config.max_freezes,
            freeze_progress=streak["freeze_progress"],
            freeze_every=config.freeze_every_days,
            done_today=streak["last_day"] == today["day"] and today["challenges"] > 0,
            used_freeze_today=streak.get("used_freeze") == today["day"],
        ),
        today=TodayOut(xp=today["xp"], goal=config.daily_goal_xp, challenges=today["challenges"]),
        xp_week=progress["xp_week"],
        xp_total=progress["xp_total"],
        badges=[badge_out(b["id"], b["earned_at"]) for b in progress["badges"] if b["id"] in BADGES],
        catalog=[badge_out(b) for b in BADGES],
        calendar=_calendar(progress),
        check=check,
        league_enabled=config.league_enabled,
        league_opt_in=progress["league"].get("opt_in", False),
    )


def _challenge_out(doc: dict) -> ChallengeOut:
    status = doc["status"]
    speaking = doc.get("speaking")
    return ChallengeOut(
        id=str(doc["_id"]),
        kind=doc["kind"],
        status=status,
        quiz=quiz_state({"quiz": doc["quiz"], "phase": "quiz" if status == "quiz" else "done"}),
        speaking=SpeakingOut(**speaking) if speaking else None,
        result=ChallengeResult(**doc["result"]) if doc.get("result") else None,
    )


async def _own(challenge_id: str, user: dict) -> dict:
    try:
        oid = ObjectId(challenge_id)
    except InvalidId as exc:
        raise HTTPException(status_code=404, detail="Challenge not found.") from exc
    doc = await db.challenges.find_one({"_id": oid, "user_id": user["_id"]})
    if doc is None:
        raise HTTPException(status_code=404, detail="Challenge not found.")
    return doc


async def _finish(doc: dict, user: dict) -> dict:
    progress, config = await _progress(user)
    quiz = doc["quiz"]
    placement = doc["kind"] == "placement"
    rating_before = doc["rating_before"]
    rating = quiz["rating"]
    level_before = level_for(progress["rating"] if not placement else rating_before)

    bank = {q["id"]: q for q in quiz["bank"]}
    correct = sum(a["correct"] for a in quiz["asked"])
    hard = sum(1 for a in quiz["asked"] if a["correct"] and bank[a["id"]]["rating"] > rating_before + 50)
    breakdown = [XpLine(label=f"{correct} correct answers", xp=correct * config.xp_correct)]
    if hard and config.xp_hard_bonus:
        breakdown.append(XpLine(label="Harder questions bonus", xp=hard * config.xp_hard_bonus))

    speaking = doc.get("speaking")
    if speaking and speaking.get("answer"):
        breakdown.append(XpLine(label="Speaking answer", xp=config.xp_spoken))
        if speaking.get("score") is not None:
            target = LEVEL_RATING[level_for(rating)]
            rating += 20 * (speaking["score"] / 100 - expected(rating, target))

    xp = sum(line.xp for line in breakdown)
    add_xp(progress, xp)
    progress["rating"] = rating
    progress["answers"] += len(quiz["asked"])
    events = {"first_challenge"}
    if len(quiz["asked"]) >= 3 and correct == len(quiz["asked"]):
        events.add("perfect")
    level_after = level_for(rating)
    if not placement and LEVELS.index(level_after) > LEVELS.index(level_before):
        events.add("level_up")
    progress["placed"] = True
    extended = count_day(progress, config)
    new_badges = award_badges(progress, events)
    await save_progress(progress)

    result = ChallengeResult(
        xp=xp,
        breakdown=[line for line in breakdown if line.xp],
        correct=correct,
        total=len(quiz["asked"]),
        rating_before=round(rating_before),
        rating_after=round(rating),
        level_before=level_for(rating_before),
        level_after=level_after,
        band_progress=round(band_progress(rating), 3),
        streak=progress["streak"]["current"],
        streak_extended=extended,
        today_xp=progress["today"]["xp"],
        goal=config.daily_goal_xp,
        goal_reached=progress["today"]["xp"] >= config.daily_goal_xp > progress["today"]["xp"] - xp,
        new_badges=[badge_out(b) for b in new_badges],
    )
    doc.update(status="completed", result=result.model_dump(), completed_at=now())
    await db.challenges.update_one(
        {"_id": doc["_id"]},
        {"$set": {"status": "completed", "result": doc["result"], "completed_at": doc["completed_at"]}},
    )
    return doc


@router.get("/progress")
async def get_progress(tz: str | None = None, user: dict = Depends(current_user)) -> ProgressOut:
    progress, config = await _progress(user, tz)
    return _to_out(user, progress, config, await _check_status(user, progress, config))


@router.post("/challenges", status_code=201)
async def start_challenge(body: StartChallenge, user: dict = Depends(current_user)) -> ChallengeOut:
    progress, config = await _progress(user, body.tz)
    if not config.enabled:
        raise HTTPException(status_code=403, detail="Daily challenges are turned off right now.")
    kind = "daily" if progress["placed"] else "placement"
    current = await db.challenges.find_one(
        {"user_id": user["_id"], "kind": kind, "status": {"$ne": "completed"}}, sort=[("created_at", -1)]
    )
    if current and current["created_at"] > now() - timedelta(hours=6):
        return _challenge_out(current)
    await db.challenges.delete_many({"user_id": user["_id"], "status": {"$ne": "completed"}})
    count = config.placement_rounds if kind == "placement" else config.daily_rounds
    quiz = await build_rounds(user["_id"], progress["rating"], count)
    if quiz is None:
        raise HTTPException(status_code=503, detail="There aren't enough practice questions yet. Please try later.")
    doc = {
        "user_id": user["_id"],
        "kind": kind,
        "status": "quiz",
        "quiz": quiz,
        "rating_before": progress["rating"],
        "speaking": None,
        "day": progress["today"]["day"],
        "created_at": now(),
    }
    doc["_id"] = (await db.challenges.insert_one(doc)).inserted_id
    return _challenge_out(doc)


@router.post("/challenges/{challenge_id}/answer")
async def answer(challenge_id: str, body: QuizAnswerRequest, user: dict = Depends(current_user)) -> ChallengeOut:
    doc = await _own(challenge_id, user)
    choice = body.choice
    if doc["status"] != "quiz" or not doc["quiz"].get("current"):
        raise HTTPException(status_code=400, detail="This round is already finished.")
    progress = await load_progress(user["_id"])
    question_id = doc["quiz"]["current"]
    correct, _, chance = answer_round(doc["quiz"], choice, doc["kind"] == "placement", progress["answers"])
    await nudge_question(question_id, correct, chance)
    if doc["quiz"]["current"] is None:
        if doc["kind"] == "placement":
            await db.challenges.update_one({"_id": doc["_id"]}, {"$set": {"quiz": doc["quiz"]}})
            return _challenge_out(await _finish(doc, user))
        recent = [
            c["speaking"]["prompt"]
            async for c in db.challenges.find(
                {"user_id": user["_id"], "speaking": {"$ne": None}}, {"speaking.prompt": 1}
            )
            .sort("created_at", -1)
            .limit(10)
        ]
        doc["status"] = "speaking"
        doc["speaking"] = {"prompt": speaking_prompt(doc["quiz"]["rating"], recent)}
    await db.challenges.update_one(
        {"_id": doc["_id"]}, {"$set": {"quiz": doc["quiz"], "status": doc["status"], "speaking": doc["speaking"]}}
    )
    return _challenge_out(doc)


@router.post("/challenges/{challenge_id}/speak")
async def speak(challenge_id: str, body: SpeakRequest, user: dict = Depends(current_user)) -> ChallengeOut:
    doc = await _own(challenge_id, user)
    if doc["status"] == "completed":
        return _challenge_out(doc)
    if doc["status"] != "speaking":
        raise HTTPException(status_code=400, detail="Finish the rounds first.")
    text = " ".join(body.text.split())
    if not body.skip and not text:
        raise HTTPException(status_code=400, detail="Say or type an answer first.")
    if not body.skip:
        config = await get_config()
        grade = await grade_speaking(
            doc["speaking"]["prompt"], text, body.mode, doc["quiz"]["rating"], config.speaking_model
        )
        doc["speaking"].update(answer=text, mode=body.mode, **grade)
        await db.challenges.update_one({"_id": doc["_id"]}, {"$set": {"speaking": doc["speaking"]}})
    return _challenge_out(await _finish(doc, user))


@router.get("/league")
async def get_league(user: dict = Depends(current_user)) -> LeagueOut:
    progress, config = await _progress(user)
    week = progress["week"]
    standings = await league(user["_id"], week)
    monday = date.fromisoformat(week_key(date.fromisoformat(progress["today"]["day"])))
    ends = datetime.combine(monday + timedelta(days=7), time.min, tzinfo=zone(progress["tz"]))
    return LeagueOut(
        enabled=config.league_enabled,
        opt_in=progress["league"].get("opt_in", False),
        week=week,
        ends_at=ends,
        entries=standings["entries"],
        me=standings["me"],
        total=standings["total"],
    )


@router.put("/league")
async def set_league(body: LeagueUpdate, user: dict = Depends(current_user)) -> LeagueOut:
    await load_progress(user["_id"])
    await db.progress.update_one({"_id": user["_id"]}, {"$set": {"league.opt_in": body.opt_in}})
    return await get_league(user)
