from dataclasses import dataclass, field


@dataclass(frozen=True)
class Persona:
    id: str
    name: str
    role: str
    specialty: str
    background: str
    personality: list[str]
    teaching_style: list[str]
    correction_style: str
    focus: list[str]
    boundaries: list[str]
    sample_phrases: list[str]
    languages: list[str] = field(default_factory=lambda: ["English"])
    temperature: float = 0.5
