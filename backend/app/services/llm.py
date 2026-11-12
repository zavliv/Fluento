from collections.abc import AsyncIterator

import groq

from app.services.app_settings import get_app_settings

from app.services.groq_pool import pool


async def chat_create(**kwargs):
    return await pool.run(kwargs["model"], lambda client: client.chat.completions.create(**kwargs))


async def transcription_create(**kwargs):
    return await pool.run(kwargs["model"], lambda client: client.audio.transcriptions.create(**kwargs))


async def speech_create(**kwargs):
    return await pool.run(kwargs["model"], lambda client: client.audio.speech.create(**kwargs))


def error_message(exc: groq.GroqError) -> str:
    if isinstance(exc, groq.RateLimitError):
        return "The model is busy right now. Please try again in a moment."
    if isinstance(exc, groq.AuthenticationError):
        return "The Groq API key is invalid. Check GROQ_API_KEY in backend/.env."
    if isinstance(exc, groq.APIConnectionError):
        return "Couldn't reach Groq. Check your internet connection."
    return "The model returned an error. Please try again."


async def stream_completion(
    system_prompt: str,
    messages: list[dict],
    temperature: float | None = None,
) -> AsyncIterator[dict]:
    app_settings = await get_app_settings()
    history = [{"role": "system", "content": system_prompt}]
    history += [{"role": m["role"], "content": m["content"]} for m in messages[-app_settings["history_limit"] :]]

    try:
        stream = await chat_create(
            model=app_settings["llm_model"],
            messages=history,
            temperature=app_settings["llm_temperature"] if temperature is None else temperature,
            max_completion_tokens=app_settings["llm_max_tokens"],
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


async def complete(
    system_prompt: str,
    messages: list[dict],
    temperature: float = 0.3,
    max_tokens: int = 1024,
    json_mode: bool = False,
    reasoning_effort: str | None = None,
) -> str:
    app_settings = await get_app_settings()
    response = await chat_create(
        model=app_settings["llm_model"],
        messages=[{"role": "system", "content": system_prompt}, *messages],
        temperature=temperature,
        max_completion_tokens=max_tokens,
        **({"response_format": {"type": "json_object"}} if json_mode else {}),
        **({"reasoning_effort": reasoning_effort} if reasoning_effort else {}),
    )
    return response.choices[0].message.content or ""
