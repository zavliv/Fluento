import json
import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from groq import AsyncGroq, GroqError
from pydantic import BaseModel

load_dotenv()

MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")
SYSTEM_PROMPT = (
    "You are a helpful, concise assistant. "
    "Use Markdown for structure and fenced code blocks for code."
)

client = AsyncGroq()

app = FastAPI(title="Agent Chat API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_ORIGIN", "http://localhost:3000")],
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    conversation_id: str
    messages: list[ChatMessage]


def sse(event: dict) -> str:
    return f"data: {json.dumps(event)}\n\n"


async def llm_stream(messages: list[ChatMessage]):
    history = [{"role": "system", "content": SYSTEM_PROMPT}]
    history += [{"role": m.role, "content": m.content} for m in messages]

    try:
        stream = await client.chat.completions.create(
            model=MODEL,
            messages=history,
            stream=True,
        )
        async for chunk in stream:
            if not chunk.choices:
                continue
            text = chunk.choices[0].delta.content
            if text:
                yield sse({"type": "text", "text": text})
    except GroqError as e:
        yield sse({"type": "error", "message": str(e)})
        return

    yield sse({"type": "done"})


@app.get("/health")
def health():
    return {"status": "ok", "model": MODEL}


@app.post("/chat")
async def chat(request: ChatRequest):
    return StreamingResponse(llm_stream(request.messages), media_type="text/event-stream")
