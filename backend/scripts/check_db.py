"""Smoke-check DATABASE_URL connectivity and create tables."""

from __future__ import annotations

from sqlalchemy import text

from app.database import models  # noqa: F401
from app.database.session import Base, engine


def main() -> None:
    print(f"Engine URL dialect: {engine.url.get_backend_name()}")
    print(f"Host: {engine.url.host}")
    print(f"Database: {engine.url.database}")
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
        conn.commit()
    Base.metadata.create_all(bind=engine)
    print("OK — connected and tables ensured.")


if __name__ == "__main__":
    main()
