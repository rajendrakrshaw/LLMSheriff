import os
from pathlib import Path
from typing import Annotated

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[2]
ROOT_DIR = BACKEND_DIR.parent
# Vercel serverless filesystem is read-only under /var/task; use /tmp.
DATA_DIR = Path("/tmp/llmsheriff-data") if os.getenv("VERCEL") else BACKEND_DIR / "data"


class Settings(BaseSettings):
    app_env: str = "development"
    database_url: str = f"sqlite:///{(DATA_DIR / 'llmsheriff.db').as_posix()}"
    nimotron_api_key: str = ""
    nimotron_base_url: str = "https://integrate.api.nvidia.com/v1"
    nimotron_model: str = "nvidia/nemotron-3-ultra-550b-a55b"
    cors_origins: Annotated[
        list[str],
        NoDecode,
        Field(
            default=[
                "http://localhost:3000",
                "http://127.0.0.1:3000",
                "https://llmsheriff.rajendra.dev",
            ]
        ),
    ]
    host: str = "0.0.0.0"
    port: int = 8000
    study_export_token: str = "change-me-study-export"
    resend_api_key: str = ""
    study_from_email: str = "LLMSheriff Study <onboarding@resend.dev>"
    study_site_url: str = "https://llmsheriff.rajendra.dev"
    study_webhook_url: str = ""

    model_config = SettingsConfigDict(
        env_file=(
            str(BACKEND_DIR / ".env"),
            str(ROOT_DIR / ".env"),
        ),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: str | list[str]) -> list[str]:
        if isinstance(value, str):
            return [item.strip() for item in value.split(",") if item.strip()]
        return value

    @field_validator("database_url", mode="before")
    @classmethod
    def normalize_database_url(cls, value: str) -> str:
        # Vercel Python runtime is read-only under /var/task.
        # If DATABASE_URL still points to ./data or /var/task/data, force /tmp.
        if not isinstance(value, str):
            return value
        if os.getenv("VERCEL") and value.startswith("sqlite:///"):
            if "/var/task/data" in value or value.endswith("/data/llmsheriff.db") or value.startswith(
                "sqlite:///./data"
            ):
                return f"sqlite:///{(Path('/tmp/llmsheriff-data') / 'llmsheriff.db').as_posix()}"
        return value


settings = Settings()
try:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
except OSError:
    # Keep import-time startup resilient on read-only hosts.
    pass
