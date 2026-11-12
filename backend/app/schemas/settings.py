from pydantic import BaseModel, Field


class AppSettings(BaseModel):
    app_name: str = Field(min_length=1, max_length=40)
    llm_model: str = Field(min_length=1)
    llm_temperature: float = Field(ge=0, le=1.5)
    llm_max_tokens: int = Field(ge=256, le=32768)
    history_limit: int = Field(ge=2, le=200)
    stt_model: str = Field(min_length=1)
    default_teacher_id: str
    signup_enabled: bool
    memory_enabled: bool


class PublicSettings(BaseModel):
    app_name: str
    default_teacher_id: str
    signup_enabled: bool
