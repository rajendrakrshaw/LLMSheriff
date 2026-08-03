from app.models.schemas import Prediction


def rule_based_prediction(metrics: dict) -> Prediction:
    failed_steps = metrics.get("failed_steps", 0)
    repeated = metrics.get("consecutive_repeated_actions", 0)
    runtime = metrics.get("runtime_seconds", 0.0)
    progress = metrics.get("progress_score", 0.0)
    waiting_count = metrics.get("waiting_action_count", 0)
    waiting_ratio = metrics.get("waiting_action_ratio", 0.0)
    max_idle_gap = metrics.get("max_idle_gap_seconds", 0.0)
    mean_idle_gap = metrics.get("mean_idle_gap_seconds", 0.0)

    is_waiting_pattern = waiting_count >= 3 or waiting_ratio >= 0.4

    if failed_steps >= 3:
        return Prediction(
            state="Failed",
            confidence=0.9,
            reason=["Multiple failed steps observed in execution trace."],
        )

    # Waiting must come before Stalled: poll streaks look like loops but are
    # external-dependency waits, not unproductive work repetition.
    if is_waiting_pattern and failed_steps == 0:
        return Prediction(
            state="Waiting",
            confidence=0.86,
            reason=[
                "Repeated polling / status-check actions indicate an external wait.",
                "Execution is blocked on a dependency rather than looping on work.",
            ],
        )

    if (
        progress < 0.4
        and repeated >= 4
        and not is_waiting_pattern
        and mean_idle_gap < 12
    ):
        return Prediction(
            state="Stalled",
            confidence=0.88,
            reason=[
                "Repeated identical work actions in a tight loop.",
                "Low progress score indicates no meaningful forward movement.",
            ],
        )

    # Abandoned: long-running drift with weak progress and large idle gaps,
    # but without an explicit poll/status-wait vocabulary.
    if (
        not is_waiting_pattern
        and (
            (runtime > 280 and progress < 0.55 and (mean_idle_gap >= 20 or max_idle_gap >= 30))
            or (repeated >= 4 and mean_idle_gap >= 20 and progress < 0.55)
        )
    ):
        return Prediction(
            state="Abandoned",
            confidence=0.78,
            reason=[
                "Long idle gaps with weak progress suggest goal drift.",
                "Pattern differs from tight work loops (Stalled) and status polling (Waiting).",
            ],
        )

    if failed_steps > 0 and progress >= 0.5:
        return Prediction(
            state="Recovering",
            confidence=0.79,
            reason=[
                "Initial execution failed, but the agent adopted a new strategy.",
                "Failures are present, yet execution still shows forward progress.",
            ],
        )

    if progress > 0.92:
        return Prediction(
            state="Completed",
            confidence=0.84,
            reason=["Trace indicates high continuity and successful execution outcomes."],
        )

    return Prediction(
        state="Executing",
        confidence=0.7,
        reason=["Execution appears active with measurable forward progress."],
    )
