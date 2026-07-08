from app.models.schemas import TraceEvent


def compute_metrics(trace: list[TraceEvent]) -> dict:
    if not trace:
        return {
            "runtime_seconds": 0.0,
            "llm_calls": 0,
            "tool_calls": 0,
            "retry_count": 0,
            "failed_steps": 0,
            "avg_latency_seconds": 0.0,
            "consecutive_repeated_actions": 0,
            "progress_score": 0.0,
        }

    runtime_seconds = float((trace[-1].timestamp - trace[0].timestamp).total_seconds())
    failed_steps = sum(1 for e in trace if e.status == "failed")
    llm_calls = sum(1 for e in trace if "LLM" in e.step.upper())
    tool_calls = sum(1 for e in trace if "TOOL" in e.step.upper())
    retry_count = sum(1 for e in trace if "retry" in e.action.lower())
    avg_latency = sum(e.duration for e in trace) / len(trace)

    repeated = 1
    current_streak = 1
    for i in range(1, len(trace)):
        if trace[i].action == trace[i - 1].action:
            current_streak += 1
            repeated = max(repeated, current_streak)
        else:
            current_streak = 1

    success_rate = (len(trace) - failed_steps) / len(trace)
    repeat_penalty = max(0, repeated - 1) * 0.08
    progress_score = round(min(1.0, max(0.0, success_rate - repeat_penalty)), 3)

    return {
        "runtime_seconds": runtime_seconds,
        "llm_calls": llm_calls,
        "tool_calls": tool_calls,
        "retry_count": retry_count,
        "failed_steps": failed_steps,
        "avg_latency_seconds": round(avg_latency, 3),
        "consecutive_repeated_actions": repeated,
        "progress_score": progress_score,
    }
