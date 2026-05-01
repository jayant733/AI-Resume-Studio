from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "AI Resume Optimization Platform"
    app_env: str = "development"
    backend_cors_origins: str = "http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000,http://127.0.0.1:3001"
    database_url: str = "postgresql+psycopg://postgres:postgres@postgres:5432/resume_ai"
    auth_secret_key: str = "change-me-in-production"
    auth_token_expiry_hours: int = 24
    gemini_api_key: str | None = None
    gemini_model: str = "gemini-flash-latest"
    gemini_embedding_model: str = "models/gemini-embedding-001"
    local_embedding_model: str = "BAAI/bge-small-en-v1.5"
    vector_store_path: str = str(Path("data") / "chroma")
    upload_dir: str = str(Path("data") / "uploads")
    generated_dir: str = str(Path("data") / "generated")
    
    # Mock Stripe
    stripe_api_key: str = "sk_test_mock"
    stripe_webhook_secret: str = "whsec_mock"
    stripe_price_pro: str = "price_pro_mock"
    stripe_price_premium: str = "price_premium_mock"

    # Google OAuth
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/oauth/callback"

    # GitHub OAuth
    GITHUB_CLIENT_ID: str = ""
    GITHUB_CLIENT_SECRET: str = ""
    GITHUB_REDIRECT_URI: str = "http://localhost:8000/auth/oauth/github/callback"

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
