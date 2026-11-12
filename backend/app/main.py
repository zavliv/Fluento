import json
from collections.abc import AsyncIterator

from fastapi import FastAPI, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from app.agents.registry import TEACHERS, get_teacher
from app.config import settings
from app.schemas import ChatRequest, TeacherSummary, TranscriptionResponse
from app.speech import TranscriptionError, transcribe

app = FastAPI(title="Fluento API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)


async def to_sse(events: AsyncIterator[dict]) -> AsyncIterator[str]:
    async for event in events:
        yield f"data: {json.dumps(event)}\n\n"


@app.get("/health")
def health():
    return {"status": "ok", "model": settings.llm_model}


@app.get("/teachers")
def list_teachers() -> list[TeacherSummary]:
    return [
        TeacherSummary(
            id=agent.persona.id,
            name=agent.persona.name,
            role=agent.persona.role,
            specialty=agent.persona.specialty,
            languages=agent.persona.languages,
        )
        for agent in TEACHERS.values()
    ]


@app.post("/chat")
async def chat(request: ChatRequest):
    teacher = get_teacher(request.teacher_id)
    if teacher is None:
        raise HTTPException(status_code=404, detail=f"Unknown teacher: {request.teacher_id}")
    return StreamingResponse(
        to_sse(teacher.reply(request.messages)),
        media_type="text/event-stream",
    )


@app.post("/transcribe")
async def transcribe_audio(file: UploadFile) -> TranscriptionResponse:
    audio = await file.read()
    if not audio:
        raise HTTPException(status_code=400, detail="The recording is empty.")
    if len(audio) > settings.stt_max_bytes:
        raise HTTPException(
            status_code=413, detail="The recording is too long. Keep it under 25 MB."
        )

    try:
        text = await transcribe(audio, file.filename or "recording.webm")
    except TranscriptionError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return TranscriptionResponse(text=text)
