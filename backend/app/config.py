from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", extra="ignore", env_ignore_empty=True
    )

    groq_api_key: SecretStr | None = None
    llm_model: str = "openai/gpt-oss-120b"
    llm_max_tokens: int = 4096
    llm_temperature: float = 0.3

    stt_model: str = "whisper-large-v3-turbo"
    stt_max_bytes: int = 25 * 1024 * 1024

    history_limit: int = 40
    cors_origins: list[str] = ["http://localhost:3000"]


settings = Settings()
