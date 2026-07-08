"""Generate labelled synthetic execution traces for evaluation."""

from __future__ import annotations

import random
from datetime import datetime, timedelta, timezone

from app.models.schemas import TraceEvent

BASE = datetime(2026, 7, 8, 10, 0, 0, tzinfo=timezone.utc)

ACTION_POOL = [
    "Read configuration file",
    "Generate implementation plan",
    "Create component module",
    "Run unit tests",
    "Deploy artifact",
    "Validate output schema",
    "Fetch dependency metadata",
    "Write summary report",
]


def _event(
    offset_seconds: float,
    step: str,
    action: str,
    duration: float,
    status: str = "success",
) -> TraceEvent:
    return TraceEvent(
        timestamp=BASE + timedelta(seconds=offset_seconds),
        step=step,
        action=action,
        duration=duration,
        status=status,  # type: ignore[arg-type]
        metadata={},
    )


def generate_completed(seed: int) -> list[TraceEvent]:
    rng = random.Random(seed)
    events = [_event(0, "PLANNING", "Decompose task into subtasks", 1.0)]
    t = 4.0
    actions = rng.sample(ACTION_POOL, k=min(5, len(ACTION_POOL)))
    for i, action in enumerate(actions):
        step = "LLM_CALL" if i % 2 == 0 else "TOOL_CALL"
        events.append(_event(t, step, action, rng.uniform(1.0, 3.0)))
        t += rng.uniform(3.0, 8.0)
    return events


def generate_recovering(seed: int) -> list[TraceEvent]:
    rng = random.Random(seed)
    events = [
        _event(0, "PLANNING", "Identify execution strategy", 1.0),
        _event(5, "TOOL_CALL", "Invoke primary API endpoint", 2.5, "failed"),
        _event(12, "TOOL_CALL", "Retry primary API endpoint", 2.5, "failed"),
    ]
    t = 20.0
    for action in rng.sample(ACTION_POOL, k=3):
        events.append(_event(t, "TOOL_CALL", action, rng.uniform(1.5, 2.5)))
        t += rng.uniform(4.0, 8.0)
    return events


def generate_waiting(seed: int) -> list[TraceEvent]:
    rng = random.Random(seed)
    events = [
        _event(0, "PLANNING", "Trigger external workflow", 1.0),
        _event(5, "TOOL_CALL", "Push deployment artifact", 1.5),
    ]
    t = 12.0
    for _ in range(rng.randint(4, 6)):
        events.append(_event(t, "TOOL_CALL", "Poll CI status: pending", rng.uniform(3.0, 5.0)))
        t += rng.uniform(10.0, 20.0)
    return events


def generate_stalled(seed: int) -> list[TraceEvent]:
    rng = random.Random(seed)
    loop_action = f"Search: topic-{seed % 17}"
    events = [_event(0, "PLANNING", "Identify search strategy", 0.9)]
    t = 3.0
    repeats = rng.randint(8, 12)
    for _ in range(repeats):
        events.append(_event(t, "TOOL_CALL", loop_action, rng.uniform(1.8, 2.6)))
        t += rng.uniform(4.0, 7.0)
    return events


def generate_abandoned(seed: int) -> list[TraceEvent]:
    rng = random.Random(seed)
    idle_action = "Determine next action"
    events = [
        _event(0, "PLANNING", "Analyse existing codebase", 1.2),
        _event(8, "LLM_CALL", "Generate refactor plan", 3.0),
        _event(20, "TOOL_CALL", "Read target module", 1.1),
    ]
    t = 40.0
    repeats = rng.randint(8, 10)
    for _ in range(repeats):
        events.append(_event(t, "LLM_CALL", idle_action, rng.uniform(1.5, 2.5)))
        t += rng.uniform(35.0, 50.0)
    return events


GENERATORS: dict[str, callable] = {
    "Completed": generate_completed,
    "Recovering": generate_recovering,
    "Waiting": generate_waiting,
    "Stalled": generate_stalled,
    "Abandoned": generate_abandoned,
}


def generate_corpus(per_class: int = 20, seed: int = 42) -> list[tuple[str, list[TraceEvent]]]:
    corpus: list[tuple[str, list[TraceEvent]]] = []
    for label, generator in GENERATORS.items():
        for i in range(per_class):
            corpus.append((label, generator(seed + i + hash(label) % 1000)))
    random.Random(seed).shuffle(corpus)
    return corpus
