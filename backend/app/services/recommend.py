from bson import ObjectId

from app.db import db
from app.schemas.recommend import LEARNER_GOALS, Reason, Recommendation, WeakSkill
from app.services.app_settings import get_app_settings
from app.services.progress import level_for

SPECIALIST = {"work", "exams"}
LEVEL_FIT: dict[str, dict[str, float]] = {
    "A1": {"Beginner": 1, "All levels": 0.5},
    "A2": {"Beginner": 1, "All levels": 0.5, "Intermediate": 0.5},
    "B1": {"Intermediate": 1, "All levels": 0.5, "Beginner": 0.25},
    "B2": {"Intermediate": 1, "Advanced": 0.75, "All levels": 0.5},
    "C1": {"Advanced": 1, "All levels": 0.5, "Intermediate": 0.5},
    "C2": {"Advanced": 1, "All levels": 0.5, "Intermediate": 0.25},
}
GRAMMAR_CATEGORIES = {"tense", "verb form", "agreement", "article", "preposition", "plural", "word order"}
VOCABULARY_CATEGORIES = {"word choice", "spelling"}


async def _from_challenges(user_id: ObjectId) -> WeakSkill | None:
    stats = {"grammar": [0, 0], "vocabulary": [0, 0]}
    cursor = (
        db.challenges.find({"user_id": user_id, "status": "completed"}, {"quiz.bank": 1, "quiz.asked": 1})
        .sort("created_at", -1)
        .limit(12)
    )
    async for doc in cursor:
        quiz = doc.get("quiz") or {}
        skills = {q["id"]: q.get("skill") for q in quiz.get("bank", [])}
        for answer in quiz.get("asked", []):
            skill = skills.get(answer["id"])
            if skill in stats:
                stats[skill][0] += 1 if answer["correct"] else 0
                stats[skill][1] += 1
    if min(total for _, total in stats.values()) < 4:
        return None
    accuracy = {skill: right / total for skill, (right, total) in stats.items()}
    weak = min(accuracy, key=accuracy.get)
    strong = max(accuracy, key=accuracy.get)
    if accuracy[strong] - accuracy[weak] < 0.15:
        return None
    return WeakSkill(
        skill=weak,
        source="challenges",
        detail=f"You get {round(accuracy[weak] * 100)}% of {weak} questions right in challenges",
    )


async def _from_level_test(user: dict) -> WeakSkill | None:
    test_id = (user.get("level") or {}).get("test_id")
    if not test_id:
        return None
    test = await db.level_tests.find_one({"_id": test_id}, {"result.scores": 1})
    scores = ((test or {}).get("result") or {}).get("scores")
    if not scores:
        return None
    order = list(LEVEL_FIT)
    ranked = {
        "grammar": order.index(scores["grammar"]),
        "vocabulary": order.index(scores["vocabulary"]),
        "speaking": order.index(scores["fluency"]),
    }
    weak = min(ranked, key=ranked.get)
    if ranked[weak] == max(ranked.values()):
        return None
    return WeakSkill(skill=weak, source="level test", detail=f"Your level test showed {weak} as your weakest area")


async def _from_mistakes(user_id: ObjectId) -> WeakSkill | None:
    counts = {"grammar": 0, "vocabulary": 0}
    async for row in await db.mistakes.aggregate(
        [{"$match": {"user_id": user_id, "mastered": False}}, {"$group": {"_id": "$category", "count": {"$sum": 1}}}]
    ):
        if row["_id"] in GRAMMAR_CATEGORIES:
            counts["grammar"] += row["count"]
        elif row["_id"] in VOCABULARY_CATEGORIES:
            counts["vocabulary"] += row["count"]
    total = sum(counts.values())
    if total < 6:
        return None
    if counts["vocabulary"] / total >= 0.4:
        weak = "vocabulary"
    elif counts["grammar"] / total >= 0.8:
        weak = "grammar"
    else:
        return None
    return WeakSkill(
        skill=weak, source="chat mistakes", detail=f"Most of your open mistakes in chats are {weak} mistakes"
    )


async def weak_skill(user: dict) -> WeakSkill | None:
    return await _from_challenges(user["_id"]) or await _from_level_test(user) or await _from_mistakes(user["_id"])


async def learner_level(user: dict) -> str | None:
    progress = await db.progress.find_one({"_id": user["_id"]}, {"placed": 1, "rating": 1})
    if progress and progress.get("placed"):
        return level_for(progress["rating"])
    return (user.get("level") or {}).get("level")


async def recommend(user: dict) -> Recommendation:
    goal = user.get("goal") if user.get("goal") in LEARNER_GOALS else None
    level = await learner_level(user)
    weak = await weak_skill(user)
    mine = set(user.get("teacher_ids", []))
    default_id = (await get_app_settings())["default_teacher_id"]
    fit_table = LEVEL_FIT.get(level or "", {})

    best: tuple[float, int, dict, dict] | None = None
    async for teacher in db.teachers.find({"enabled": True}):
        if teacher["_id"] in mine:
            continue
        goals = set(teacher.get("goals", []))
        hits = {"goal": bool(goal and goal in goals), "weak": bool(weak and weak.skill in goals)}
        fit = fit_table.get(teacher.get("level", "All levels"), 0) if level else 0.5
        if fit == 0:
            if not hits["goal"]:
                continue
            fit = 0.1
        hits["level"] = bool(level and fit >= 1)
        score = fit + (3 if hits["goal"] else 0) + (2 if hits["weak"] else 0)
        score -= 2 * len((goals & SPECIALIST) - {goal})
        if level in ("A1", "A2") and "beginners" in goals:
            score += 1
        if teacher["_id"] == default_id:
            score += 0.1
        key = (score, -teacher.get("order", 0))
        if best is None or key > best[:2]:
            best = (score, -teacher.get("order", 0), teacher, hits)

    if best is None:
        return Recommendation(teacher_id=None, goal=goal, weak_skill=weak, level=level, reasons=[])

    teacher, hits = best[2], best[3]
    reasons = []
    if hits["goal"]:
        reasons.append(Reason(kind="goal", text=f"Matches your goal: {LEARNER_GOALS[goal]}"))
    if hits["weak"]:
        reasons.append(Reason(kind="weak", text=f"Works on {weak.skill}, your weakest area", detail=weak.detail))
    if hits["level"]:
        reasons.append(Reason(kind="level", text=f"Teaches at your {level} level"))
    if not reasons:
        text = "A friendly teacher to start with" if not goal else "The closest match we have right now"
        reasons.append(Reason(kind="default", text=text))
    return Recommendation(teacher_id=teacher["_id"], goal=goal, weak_skill=weak, level=level, reasons=reasons)
