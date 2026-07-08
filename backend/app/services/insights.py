from app.models.schemas import DisagreementAnalysis, Prediction, Recommendation, TraceEvent

POSITIVE_STATES = {"Planning", "Executing", "Waiting", "Recovering", "Completed"}
NEGATIVE_STATES = {"Stalled", "Abandoned", "Failed"}


def build_evidence(trace: list[TraceEvent], metrics: dict) -> list[str]:
    evidence: list[str] = []
    failed_steps = metrics.get("failed_steps", 0)
    repeated = metrics.get("consecutive_repeated_actions", 0)
    runtime = metrics.get("runtime_seconds", 0.0)
    progress = metrics.get("progress_score", 0.0)
    retry_count = metrics.get("retry_count", 0)
    avg_latency = metrics.get("avg_latency_seconds", 0.0)
    tool_calls = metrics.get("tool_calls", 0)
    llm_calls = metrics.get("llm_calls", 0)

    has_planning = any("PLAN" in event.step.upper() for event in trace)
    unique_actions = len({event.action for event in trace})
    unique_steps = len({event.step for event in trace})
    last_status = trace[-1].status if trace else "success"

    if has_planning:
        evidence.append("✓ Planning phase observed before execution.")
    if failed_steps == 0:
        evidence.append("✓ No failed steps in the execution trace.")
    elif failed_steps > 0:
        evidence.append(f"✗ {failed_steps} failed step(s) detected in the trace.")

    if repeated <= 1:
        evidence.append("✓ No repeated identical actions detected.")
    elif repeated >= 3:
        evidence.append(f"✗ {repeated} consecutive repeated actions — possible loop.")
    else:
        evidence.append(f"✗ {repeated} repeated actions observed.")

    if unique_actions >= 3 or unique_steps >= 3:
        evidence.append("✓ Multiple distinct execution stages observed.")
    elif len(trace) >= 3:
        evidence.append("✗ Limited state transitions — execution may be stuck.")

    if runtime <= 120:
        evidence.append("✓ Runtime within expected duration threshold.")
    elif runtime > 300:
        evidence.append("✗ Runtime exceeded expected duration threshold.")

    if progress >= 0.75:
        evidence.append("✓ Progress score indicates meaningful forward movement.")
    elif progress < 0.4:
        evidence.append("✗ Low progress score — little observable advancement.")

    if retry_count > 0 and failed_steps > 0:
        evidence.append(f"✗ {retry_count} retry attempt(s) after failures.")
    elif retry_count > 0:
        evidence.append(f"✓ {retry_count} retry attempt(s) observed.")

    if tool_calls > 0:
        evidence.append(f"✓ {tool_calls} tool invocation(s) recorded.")
    if llm_calls > 0:
        evidence.append(f"✓ {llm_calls} LLM reasoning step(s) recorded.")

    if avg_latency <= 5:
        evidence.append("✓ Average step latency below threshold.")
    elif avg_latency > 8:
        evidence.append("✗ Average step latency above threshold.")

    if last_status == "success" and progress > 0.85:
        evidence.append("✓ Final step completed successfully.")
    elif last_status == "failed":
        evidence.append("✗ Trace ends on a failed step.")

    return evidence


def enrich_prediction_reasons(
    prediction: Prediction, trace: list[TraceEvent], metrics: dict
) -> Prediction:
    evidence = build_evidence(trace, metrics)
    positive = [item[2:] for item in evidence if item.startswith("✓")]
    negative = [item[2:] for item in evidence if item.startswith("✗")]

    if prediction.state in POSITIVE_STATES:
        selected = positive[:3] + negative[:2]
    else:
        selected = negative[:3] + positive[:2]

    merged: list[str] = []
    for item in prediction.reason + selected:
        if item and item not in merged:
            merged.append(item)
    return prediction.model_copy(update={"reason": merged[:6]})


def build_recommendation(
    metrics: dict, rule_prediction: Prediction, llm_prediction: Prediction
) -> Recommendation:
    failed_steps = metrics.get("failed_steps", 0)
    repeated = metrics.get("consecutive_repeated_actions", 0)
    progress = metrics.get("progress_score", 0.0)
    runtime = metrics.get("runtime_seconds", 0.0)

    states = {rule_prediction.state, llm_prediction.state}
    negative = states & NEGATIVE_STATES

    if negative & {"Stalled", "Abandoned", "Failed"} or failed_steps >= 3 or repeated >= 5:
        reasons: list[str] = []
        if repeated >= 3:
            reasons.append(
                f"The agent repeated the same action {repeated} times without changing strategy."
            )
        if failed_steps >= 3:
            reasons.append(f"{failed_steps} tool or reasoning steps failed without recovery.")
        if progress < 0.4:
            reasons.append("Progress score remains low with no observable advancement.")
        if runtime > 300 and progress < 0.5:
            reasons.append("Long runtime with weak progress suggests goal abandonment.")
        if not reasons:
            reasons.append("Behavioral analyzers flagged a high-risk execution pattern.")
        return Recommendation(
            level="intervene",
            title="Human intervention recommended",
            reasons=reasons,
        )

    if negative or repeated >= 3 or failed_steps > 0 or progress < 0.6:
        reasons = []
        if rule_prediction.state != llm_prediction.state:
            reasons.append(
                f"Analyzers disagree ({rule_prediction.state} vs {llm_prediction.state})."
            )
        if repeated >= 3:
            reasons.append("Repeated actions detected — monitor for looping behavior.")
        if failed_steps > 0:
            reasons.append("Failures present; watch whether the agent recovers.")
        if not reasons:
            reasons.append("Execution shows early signs of instability.")
        return Recommendation(
            level="monitor",
            title="Continue monitoring",
            reasons=reasons,
        )

    return Recommendation(
        level="none",
        title="No action required",
        reasons=["Execution appears healthy with consistent progress toward the assigned goal."],
    )


def build_disagreement(
    rule_prediction: Prediction,
    llm_prediction: Prediction,
    trace: list[TraceEvent],
    metrics: dict,
) -> DisagreementAnalysis | None:
    if rule_prediction.state == llm_prediction.state:
        return None

    last_action = trace[-1].action if trace else "unknown step"
    progress = metrics.get("progress_score", 0.0)
    failed_steps = metrics.get("failed_steps", 0)

    rule_perspective = (
        f"Rule engine classified the trace as {rule_prediction.state} because "
        f"{rule_prediction.reason[0].lower() if rule_prediction.reason else 'threshold rules matched.'}"
    )
    llm_perspective = (
        f"Nimotron classified the trace as {llm_prediction.state} because "
        f"{llm_prediction.reason[0].lower() if llm_prediction.reason else 'the trace pattern suggests ongoing work.'}"
    )

    if rule_prediction.state == "Completed" and llm_prediction.state == "Executing":
        rule_perspective = (
            "Rule engine: high progress score and successful final steps suggest task completion."
        )
        llm_perspective = (
            "Nimotron: final deliverable or explicit completion signal not yet observed, "
            "so execution may still be in progress."
        )
    elif rule_prediction.state == "Stalled" and llm_prediction.state == "Recovering":
        rule_perspective = (
            "Rule engine: repeated identical actions and low progress indicate stalling."
        )
        llm_perspective = (
            "Nimotron: failures are present but the agent is still attempting alternative strategies."
        )
    elif rule_prediction.state == "Executing" and llm_prediction.state == "Waiting":
        rule_perspective = (
            f"Rule engine: active steps continue with measurable progress ({progress:.0%})."
        )
        llm_perspective = (
            f"Nimotron: recent actions such as '{last_action}' resemble polling or waiting "
            "for an external dependency."
        )

    summary = (
        f"Analyzers disagree on whether the agent has finished its goal. "
        f"Rule engine predicts {rule_prediction.state} ({rule_prediction.confidence:.0%} confidence) "
        f"while Nimotron predicts {llm_prediction.state} ({llm_prediction.confidence:.0%} confidence)."
    )
    if failed_steps > 0:
        summary += f" {failed_steps} failed step(s) make the trace behaviorally ambiguous."

    return DisagreementAnalysis(
        summary=summary,
        rule_perspective=rule_perspective,
        llm_perspective=llm_perspective,
    )
