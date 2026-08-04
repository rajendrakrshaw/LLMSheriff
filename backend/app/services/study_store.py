"""Study annotation persistence helpers (SQLite + JSONL)."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from app.core.config import DATA_DIR

JSONL_PATH = DATA_DIR / "study_annotations.jsonl"


def append_annotation_jsonl(payload: dict[str, Any]) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with JSONL_PATH.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(payload, ensure_ascii=False) + "\n")


def read_annotation_jsonl() -> list[dict[str, Any]]:
    if not JSONL_PATH.is_file():
        return []
    rows: list[dict[str, Any]] = []
    try:
        text = JSONL_PATH.read_text(encoding="utf-8")
    except OSError:
        return []
    for line in text.splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            item = json.loads(line)
        except json.JSONDecodeError:
            continue
        if isinstance(item, dict) and item.get("trace_id") and item.get("state"):
            rows.append(item)
    return rows


def latest_jsonl_by_session_trace(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Keep the latest row per (session_id, trace_id)."""
    latest: dict[tuple[str, str], dict[str, Any]] = {}
    for row in rows:
        key = (str(row.get("session_id") or ""), str(row.get("trace_id") or ""))
        latest[key] = row
    return list(latest.values())
