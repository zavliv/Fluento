from fastapi import APIRouter, Depends, HTTPException, UploadFile

from app.config import settings
from app.db import db
from app.schemas.conversations import TranscriptionResponse
from app.schemas.settings import PublicSettings
from app.schemas.teachers import TeacherPublic, teacher_public
from app.security import current_user
from app.services.app_settings import get_app_settings
from app.services.speech import TranscriptionError, transcribe

router = APIRouter(tags=["public"])


@router.get("/health")
async def health() -> dict:
    return {"status": "ok", "model": (await get_app_settings())["llm_model"]}


@router.get("/teachers")
async def list_teachers() -> list[TeacherPublic]:
    docs = await db.teachers.find({"enabled": True}).sort("order", 1).to_list()
    return [teacher_public(doc) for doc in docs]


@router.get("/app-settings")
async def public_settings() -> PublicSettings:
    return PublicSettings(**(await get_app_settings()))


@router.post("/transcribe", dependencies=[Depends(current_user)])
async def transcribe_audio(file: UploadFile) -> TranscriptionResponse:
    audio = await file.read()
    if not audio:
        raise HTTPException(status_code=400, detail="The recording is empty.")
    if len(audio) > settings.stt_max_bytes:
        raise HTTPException(status_code=413, detail="The recording is too long. Keep it under 25 MB.")
    try:
        text = await transcribe(audio, file.filename or "recording.webm")
    except TranscriptionError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    return TranscriptionResponse(text=text)
