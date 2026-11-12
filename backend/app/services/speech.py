import groq

from app.services.app_settings import get_app_settings
from app.services.llm import client, error_message


class TranscriptionError(Exception):
    pass


async def transcribe(audio: bytes, filename: str) -> str:
    app_settings = await get_app_settings()
    try:
        result = await client.audio.transcriptions.create(
            model=app_settings["stt_model"],
            file=(filename, audio),
            prompt=app_settings["app_name"],
        )
    except groq.GroqError as exc:
        raise TranscriptionError(error_message(exc)) from exc
    return result.text.strip()
