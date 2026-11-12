import json
from collections.abc import AsyncIterator

from fastapi import FastAPI, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from app.config import settings
from app.llm import stream_reply
from app.schemas import ChatRequest, TranscriptionResponse
from app.speech import TranscriptionError, transcribe

app = FastAPI(title="Orbit AI API")

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


@app.post("/chat")
async def chat(request: ChatRequest):
    return StreamingResponse(
        to_sse(stream_reply(request.messages, request.system_prompt)),
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
