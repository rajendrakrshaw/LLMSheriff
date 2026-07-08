from app.models.schemas import Prediction


def rule_based_prediction(metrics: dict) -> Prediction:
    failed_steps = metrics.get("failed_steps", 0)
    repeated = metrics.get("consecutive_repeated_actions", 0)
    runtime = metrics.get("runtime_seconds", 0.0)
    progress = metrics.get("progress_score", 0.0)

    if failed_steps >= 3:
        return Prediction(
            state="Failed",
            confidence=0.9,
            reason=["Multiple failed steps observed in execution trace."],
        )

    if progress < 0.35 and repeated >= 3:
        return Prediction(
            state="Stalled",
            confidence=0.88,
            reason=[
                "Repeated identical actions detected.",
                "Low progress score indicates no meaningful forward movement.",
            ],
        )

    if runtime > 300 and progress < 0.5:
        return Prediction(
            state="Abandoned",
            confidence=0.73,
            reason=["Long runtime with weak progress suggests goal drift or abandonment."],
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
