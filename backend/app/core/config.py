from pathlib import Path
from typing import Annotated

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[2]
ROOT_DIR = BACKEND_DIR.parent
DATA_DIR = BACKEND_DIR / "data"


class Settings(BaseSettings):
    app_env: str = "development"
    database_url: str = f"sqlite:///{(DATA_DIR / 'llmsheriff.db').as_posix()}"
    nimotron_api_key: str = ""
    nimotron_base_url: str = "https://integrate.api.nvidia.com/v1"
    nimotron_model: str = "nvidia/nemotron-3-ultra-550b-a55b"
    cors_origins: Annotated[
        list[str],
        NoDecode,
        Field(default=["http://localhost:3000", "http://127.0.0.1:3000"]),
    ]
    host: str = "0.0.0.0"
    port: int = 8000
    study_export_token: str = "change-me-study-export"

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


settings = Settings()
DATA_DIR.mkdir(parents=True, exist_ok=True)
