import asyncio
import json
import os
import uuid

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

load_dotenv()

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


async def demo_stream(user_text: str):
    tool_id = f"tool_{uuid.uuid4().hex[:8]}"
    yield sse({"type": "tool_call", "id": tool_id, "name": "echo", "input": {"text": user_text}})
    await asyncio.sleep(0.8)
    yield sse({"type": "tool_result", "id": tool_id, "output": user_text, "is_error": False})

    reply = (
        f"You said: **{user_text}**\n\n"
        "This is a demo reply from the backend. Replace `demo_stream` in "
        "`backend/app/main.py` with a real LLM call to bring the agent to life."
    )
    for word in reply.split(" "):
        yield sse({"type": "text", "text": word + " "})
        await asyncio.sleep(0.03)

    yield sse({"type": "done"})


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/chat")
async def chat(request: ChatRequest):
    last_user_message = request.messages[-1].content if request.messages else ""
    return StreamingResponse(demo_stream(last_user_message), media_type="text/event-stream")
