from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field

AgentState = Literal[
    "Planning",
    "Executing",
    "Waiting",
    "Recovering",
    "Stalled",
    "Abandoned",
    "Completed",
    "Failed",
]


class TraceEvent(BaseModel):
    timestamp: datetime
    step: str
    action: str
    duration: float = Field(ge=0.0)
    status: Literal["success", "failed", "pending"]
    metadata: dict[str, Any] = Field(default_factory=dict)


class AnalyzeRequest(BaseModel):
    task_id: str
    user_prompt: str
    current_goal: str
    trace: list[TraceEvent]


class Prediction(BaseModel):
    state: AgentState
    confidence: float = Field(ge=0.0, le=1.0)
    reason: list[str]


class AnalyzeResponse(BaseModel):
    task_id: str
    run_id: int | None = None
    metrics: dict[str, Any]
    rule_engine: Prediction
    llm_engine: Prediction
