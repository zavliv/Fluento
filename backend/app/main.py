import json
from collections.abc import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from app.config import settings
from app.llm import stream_reply
from app.schemas import ChatRequest

app = FastAPI(title="Orbit API")

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
        to_sse(stream_reply(request.messages)),
        media_type="text/event-stream",
    )
