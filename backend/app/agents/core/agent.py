from collections.abc import AsyncIterator

from app.agents.core.persona import Persona
from app.agents.core.prompt import build_system_prompt
from app.llm import stream_completion
from app.schemas import ChatMessage


class TeacherAgent:
    def __init__(self, persona: Persona):
        self.persona = persona
        self.system_prompt = build_system_prompt(persona)

    def reply(self, messages: list[ChatMessage]) -> AsyncIterator[dict]:
        return stream_completion(self.system_prompt, messages, self.persona.temperature)
