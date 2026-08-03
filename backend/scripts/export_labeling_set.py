"""Export a stratified labeling set for human inter-rater study.

Creates:
  paper/human_study/export/traces_json/TXXX.json   — raw traces (no labels)
  paper/human_study/export/traces_readable/TXXX.txt — human-readable views
  paper/human_study/export/manifest.csv            — trace index (no gold)
  paper/human_study/private/gold_labels.json       — experimenter-only labels
  paper/human_study/annotations_rater_A.csv        — blank sheets for raters
  paper/human_study/annotations_rater_B.csv
  paper/human_study/annotations_rater_C.csv
"""

from __future__ import annotations

import csv
import json
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
ROOT = BACKEND_DIR.parent
sys.path.insert(0, str(BACKEND_DIR))

from scripts.synthetic_traces import GENERATORS

STUDY_DIR = ROOT / "paper" / "human_study"
EXPORT_DIR = STUDY_DIR / "export"
PRIVATE_DIR = STUDY_DIR / "private"
JSON_DIR = EXPORT_DIR / "traces_json"
READABLE_DIR = EXPORT_DIR / "traces_readable"

LABELS = list(GENERATORS.keys())
PER_CLASS = 8  # 8 × 5 = 40 traces
SEED_BASE = 2026


def _trace_to_dict(trace) -> list[dict]:
    return [
        {
            "timestamp": e.timestamp.isoformat().replace("+00:00", "Z"),
            "step": e.step,
            "action": e.action,
            "duration": round(float(e.duration), 2),
            "status": e.status,
        }
        for e in trace
    ]


def _readable(trace_id: str, events: list[dict]) -> str:
    lines = [
        f"Trace ID: {trace_id}",
        "Task context: autonomous agent execution (goal progress unknown to you).",
        "",
        "Events (in order):",
        "-" * 60,
    ]
    for i, e in enumerate(events, start=1):
        lines.append(
            f"{i:02d}. [{e['timestamp']}] {e['step']} | {e['action']} | "
            f"{e['duration']}s | {e['status']}"
        )
    lines.extend(
        [
            "-" * 60,
            "",
            "Choose ONE state:",
            "Completed | Recovering | Waiting | Stalled | Abandoned",
            "(Also allowed if needed: Planning | Executing | Failed)",
            "",
            "See RUBRIC.md for definitions and decision tips.",
        ]
    )
    return "\n".join(lines)


def main() -> None:
    for path in (JSON_DIR, READABLE_DIR, PRIVATE_DIR):
        path.mkdir(parents=True, exist_ok=True)

    items: list[dict] = []
    gold: dict[str, str] = {}
    counter = 1

    for label in LABELS:
        generator = GENERATORS[label]
        for i in range(PER_CLASS):
            seed = SEED_BASE + counter * 17 + i
            trace = generator(seed)
            events = _trace_to_dict(trace)
            trace_id = f"T{counter:03d}"
            items.append({"trace_id": trace_id, "n_events": len(events)})
            gold[trace_id] = label

            (JSON_DIR / f"{trace_id}.json").write_text(
                json.dumps({"trace_id": trace_id, "events": events}, indent=2),
                encoding="utf-8",
            )
            (READABLE_DIR / f"{trace_id}.txt").write_text(
                _readable(trace_id, events),
                encoding="utf-8",
            )
            counter += 1

    # Manifest without gold labels (safe to share)
    manifest_path = EXPORT_DIR / "manifest.csv"
    with manifest_path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["trace_id", "n_events", "file_json", "file_txt"])
        writer.writeheader()
        for item in items:
            tid = item["trace_id"]
            writer.writerow(
                {
                    "trace_id": tid,
                    "n_events": item["n_events"],
                    "file_json": f"traces_json/{tid}.json",
                    "file_txt": f"traces_readable/{tid}.txt",
                }
            )

    # Gold labels — experimenter only
    (PRIVATE_DIR / "gold_labels.json").write_text(
        json.dumps(
            {
                "n": len(gold),
                "per_class": PER_CLASS,
                "labels": LABELS,
                "gold": gold,
            },
            indent=2,
        ),
        encoding="utf-8",
    )

    # Blank annotation sheets
    fieldnames = ["trace_id", "annotator_id", "state", "confidence_1_to_5", "notes"]
    for rater in ("A", "B", "C"):
        sheet = STUDY_DIR / f"annotations_rater_{rater}.csv"
        with sheet.open("w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            for item in items:
                writer.writerow(
                    {
                        "trace_id": item["trace_id"],
                        "annotator_id": rater,
                        "state": "",
                        "confidence_1_to_5": "",
                        "notes": "",
                    }
                )

    print(f"Exported {len(items)} traces to {EXPORT_DIR}")
    print(f"Gold labels (private): {PRIVATE_DIR / 'gold_labels.json'}")
    print("Annotation sheets: annotations_rater_A/B/C.csv")


if __name__ == "__main__":
    main()
