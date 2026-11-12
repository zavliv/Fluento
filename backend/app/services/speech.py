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


class SpeechError(Exception):
    pass


MAX_CACHE = 300
VOICES = {"female": ("hannah", "diana", "autumn"), "male": ("troy", "daniel", "austin")}
_cache: dict[tuple[str, str, str], bytes] = {}


def pick_voice(default: str, gender: str | None) -> str:
    if gender not in VOICES or default in VOICES[gender]:
        return default
    return VOICES[gender][0]


async def synthesize(text: str, gender: str | None = None) -> bytes:
    app_settings = await get_app_settings()
    model, voice = app_settings["tts_model"], pick_voice(app_settings["tts_voice"], gender)
    key = (model, voice, text)
    if key in _cache:
        return _cache[key]
    try:
        response = await client.audio.speech.create(model=model, voice=voice, input=text, response_format="wav")
        audio = await response.read()
    except groq.GroqError as exc:
        if isinstance(exc, groq.BadRequestError) and "terms" in str(exc):
            raise SpeechError("The natural voice needs its terms accepted in the Groq console.") from exc
        raise SpeechError(error_message(exc)) from exc
    if len(_cache) >= MAX_CACHE:
        _cache.pop(next(iter(_cache)))
    _cache[key] = audio
    return audio
