from collections.abc import AsyncIterator

import groq

from app.config import settings
from app.prompts import SYSTEM_PROMPT
from app.schemas import ChatMessage

if settings.groq_api_key is None:
    raise RuntimeError("GROQ_API_KEY is not set (add it to backend/.env)")

client = groq.AsyncGroq(api_key=settings.groq_api_key.get_secret_value())


def error_message(exc: groq.GroqError) -> str:
    if isinstance(exc, groq.RateLimitError):
        return "The model is busy right now. Please try again in a moment."
    if isinstance(exc, groq.AuthenticationError):
        return "The Groq API key is invalid. Check GROQ_API_KEY in backend/.env."
    if isinstance(exc, groq.APIConnectionError):
        return "Couldn't reach Groq. Check your internet connection."
    return "The model returned an error. Please try again."


async def stream_reply(messages: list[ChatMessage]) -> AsyncIterator[dict]:
    history = [{"role": "system", "content": SYSTEM_PROMPT}]
    history += [m.model_dump() for m in messages[-settings.history_limit :]]

    try:
        stream = await client.chat.completions.create(
            model=settings.llm_model,
            messages=history,
            temperature=settings.llm_temperature,
            max_completion_tokens=settings.llm_max_tokens,
            stream=True,
        )
        async for chunk in stream:
            text = chunk.choices[0].delta.content if chunk.choices else None
            if text:
                yield {"type": "text", "text": text}
    except groq.GroqError as exc:
        yield {"type": "error", "message": error_message(exc)}
        return

    yield {"type": "done"}
