from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore", env_ignore_empty=True)

    groq_api_key: SecretStr | None = None

    mongodb_uri: SecretStr | None = None
    mongodb_db: str = "fluento"

    jwt_secret: SecretStr | None = None
    session_days: int = 30
    cookie_name: str = "fluento_session"
    admin_cookie_name: str = "fluento_admin_session"
    admin_session_days: int = 7
    cookie_secure: bool = False

    admin_email: str | None = None
    admin_password: SecretStr | None = None
    admin_name: str = "Admin"

    llm_model: str = "openai/gpt-oss-120b"
    llm_max_tokens: int = 4096
    llm_temperature: float = 0.3
    stt_model: str = "whisper-large-v3-turbo"
    history_limit: int = 40
    stt_max_bytes: int = 25 * 1024 * 1024

    cors_origins: list[str] = ["http://localhost:3000"]


settings = Settings()

for name in ("groq_api_key", "mongodb_uri", "jwt_secret"):
    if getattr(settings, name) is None:
        raise RuntimeError(f"{name.upper()} is not set (add it to backend/.env)")
