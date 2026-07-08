import json
import re
from typing import Any

import httpx

from app.core.config import settings
from app.models.schemas import Prediction, TraceEvent

VALID_STATES = {
    "Planning",
    "Executing",
    "Waiting",
    "Recovering",
    "Stalled",
    "Abandoned",
    "Completed",
    "Failed",
}


def _fallback_prediction(metrics: dict) -> Prediction:
    progress = metrics.get("progress_score", 0.0)
    failed_steps = metrics.get("failed_steps", 0)
    if failed_steps > 0 and progress > 0.5:
        return Prediction(
            state="Recovering",
            confidence=0.81,
            reason=["The trace shows setbacks followed by continued forward progress."],
        )
    if progress < 0.4:
        return Prediction(
            state="Stalled",
            confidence=0.77,
            reason=["Low progress and repeated behavior indicate likely stalling."],
        )
    return Prediction(
        state="Executing",
        confidence=0.74,
        reason=["Execution trajectory appears consistent with active task progression."],
    )


def _build_prompt(trace: list[TraceEvent], metrics: dict[str, Any]) -> str:
    return (
        "You are an AI Agent Observability Expert.\n"
        "Analyze the execution trace and determine if the agent is making meaningful progress.\n"
        "Return strictly valid JSON with keys: state, confidence, reason.\n"
        "state must be one of: Planning, Executing, Waiting, Recovering, Stalled, Abandoned, Completed, Failed.\n"
        "confidence must be a number between 0 and 1.\n"
        "reason must be a JSON array of short strings.\n"
        "Do not include markdown fences or any text outside the JSON object.\n"
        f"Metrics: {json.dumps(metrics)}\n"
        f"Trace: {json.dumps([item.model_dump(mode='json') for item in trace])}"
    )


def _extract_json_object(raw: str) -> str:
    text = raw.strip()
    fenced = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text)
    if fenced:
        return fenced.group(1).strip()
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1 and end > start:
        return text[start : end + 1]
    return text


def _parse_llm_json(raw: str) -> Prediction | None:
    try:
        data = json.loads(_extract_json_object(raw))
        state = data.get("state")
        confidence = float(data.get("confidence", 0.0))
        reason = data.get("reason") or ["No reason returned by model."]
        if state not in VALID_STATES:
            return None
        if not isinstance(reason, list):
            reason = [str(reason)]
        confidence = max(0.0, min(confidence, 1.0))
        return Prediction(state=state, confidence=confidence, reason=reason)
    except (json.JSONDecodeError, ValueError, TypeError):
        return None


async def llm_based_prediction(trace: list[TraceEvent], metrics: dict) -> Prediction:
    if not settings.nimotron_api_key:
        return _fallback_prediction(metrics)

    prompt = _build_prompt(trace, metrics)
    payload = {
        "model": settings.nimotron_model,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.2,
        "top_p": 0.95,
        "max_tokens": 1024,
        "stream": False,
        "chat_template_kwargs": {"enable_thinking": False},
    }
    headers = {
        "Authorization": f"Bearer {settings.nimotron_api_key}",
        "Content-Type": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.post(
                f"{settings.nimotron_base_url}/chat/completions",
                headers=headers,
                json=payload,
            )
            response.raise_for_status()
            message = response.json()["choices"][0]["message"]
            content = message.get("content") or ""
            if not content and message.get("reasoning_content"):
                content = message["reasoning_content"]
            parsed = _parse_llm_json(content)
            return parsed if parsed else _fallback_prediction(metrics)
    except Exception:
        return _fallback_prediction(metrics)
