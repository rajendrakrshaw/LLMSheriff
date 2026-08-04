"""Load annotation-study traces (no gold labels)."""

from __future__ import annotations

import random
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[2]
CANDIDATE_DIRS = [
    BACKEND_DIR / "study_assets" / "traces",
    BACKEND_DIR / "data" / "study" / "traces",
    BACKEND_DIR.parent / "paper" / "human_study" / "export" / "traces_readable",
]

# Fixed seed so every annotator sees the same shuffled order (not gold-label blocks).
STUDY_SHUFFLE_SEED = 20260804

ALLOWED_STATES = [
    "Completed",
    "Recovering",
    "Waiting",
    "Stalled",
    "Abandoned",
    "Executing",
    "Planning",
    "Failed",
]


def resolve_traces_dir() -> Path:
    for path in CANDIDATE_DIRS:
        if path.is_dir() and any(path.glob("T*.txt")):
            return path
    raise FileNotFoundError(
        "Study traces not found. Expected files like T001.txt under "
        "backend/study_assets/traces/"
    )


def load_study_traces(*, shuffle: bool = True) -> list[dict[str, str]]:
    traces_dir = resolve_traces_dir()
    items: list[dict[str, str]] = []
    for path in sorted(traces_dir.glob("T*.txt")):
        text = path.read_text(encoding="utf-8")
        # Hide labeling-sheet footer in the web quiz — events only.
        cut = text.find("\nChoose ONE state:")
        if cut != -1:
            text = text[:cut].rstrip()
        items.append(
            {
                "trace_id": path.stem,
                "text": text,
            }
        )
    if not items:
        raise FileNotFoundError(f"No T*.txt traces in {traces_dir}")
    if shuffle:
        rng = random.Random(STUDY_SHUFFLE_SEED)
        rng.shuffle(items)
    return items
