from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "AI Resume Optimization Platform"
    app_env: str = "development"
    backend_cors_origins: str = "http://localhost:3000"
    database_url: str = "postgresql+psycopg://postgres:postgres@postgres:5432/resume_ai"
    openai_api_key: str | None = None
    openai_chat_model: str = "gpt-4.1-mini"
    openai_embedding_model: str = "text-embedding-3-small"
    vector_store_path: str = str(Path("data") / "chroma")
    upload_dir: str = str(Path("data") / "uploads")
    generated_dir: str = str(Path("data") / "generated")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    Path(settings.vector_store_path).mkdir(parents=True, exist_ok=True)
    Path(settings.upload_dir).mkdir(parents=True, exist_ok=True)
    Path(settings.generated_dir).mkdir(parents=True, exist_ok=True)
    return settings
