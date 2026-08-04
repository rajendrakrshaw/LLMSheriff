from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.api.routes import router
from app.core.config import settings
from app.database import models
from app.database.session import Base, engine

app = FastAPI(
    title="LLMSheriff API",
    description="Intent-aware monitoring backend for autonomous AI agents.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_origin_regex=r"https://.*\.(vercel\.app|rajendra\.dev)",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")


def _ensure_annotation_profile_columns() -> None:
    """Add new SQLite columns if an older annotation_labels table already exists."""
    if not settings.database_url.startswith("sqlite"):
        return
    with engine.begin() as conn:
        rows = conn.execute(text("PRAGMA table_info(annotation_labels)")).fetchall()
        if not rows:
            return
        existing = {row[1] for row in rows}
        for column, ddl in (
            ("annotator_email", "ALTER TABLE annotation_labels ADD COLUMN annotator_email VARCHAR(256) DEFAULT ''"),
            ("annotator_profession", "ALTER TABLE annotation_labels ADD COLUMN annotator_profession VARCHAR(256) DEFAULT ''"),
            ("annotator_linkedin", "ALTER TABLE annotation_labels ADD COLUMN annotator_linkedin VARCHAR(512) DEFAULT ''"),
        ):
            if column not in existing:
                conn.execute(text(ddl))


@app.on_event("startup")
def on_startup() -> None:
    Base.metadata.create_all(bind=engine)
    try:
        _ensure_annotation_profile_columns()
    except Exception:
        # Non-fatal: study still works for fresh DBs via create_all.
        pass


@app.get("/health")
def health_check() -> dict:
    return {"status": "ok"}
