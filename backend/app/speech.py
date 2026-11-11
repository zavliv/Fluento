import groq

from app.config import settings
from app.llm import client, error_message


class TranscriptionError(Exception):
    pass


async def transcribe(audio: bytes, filename: str) -> str:
    try:
        result = await client.audio.transcriptions.create(
            model=settings.stt_model,
            file=(filename, audio),
            prompt="Orbit AI",
        )
    except groq.GroqError as exc:
        raise TranscriptionError(error_message(exc)) from exc
    return result.text.strip()
