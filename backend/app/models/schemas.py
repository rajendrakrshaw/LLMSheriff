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


class Recommendation(BaseModel):
    level: Literal["none", "monitor", "intervene"]
    title: str
    reasons: list[str]


class DisagreementAnalysis(BaseModel):
    summary: str
    rule_perspective: str
    llm_perspective: str


class AnalyzeResponse(BaseModel):
    task_id: str
    run_id: int | None = None
    metrics: dict[str, Any]
    evidence: list[str] = Field(default_factory=list)
    rule_engine: Prediction
    llm_engine: Prediction
    recommendation: Recommendation
    disagreement: DisagreementAnalysis | None = None


class StudyTrace(BaseModel):
    trace_id: str
    text: str


class StudyTracesResponse(BaseModel):
    states: list[str]
    traces: list[StudyTrace]
    count: int


class StudyAnnotationItem(BaseModel):
    trace_id: str
    state: AgentState
    confidence: int | None = Field(default=None, ge=1, le=5)
    notes: str = ""


class StudyAnnotationsRequest(BaseModel):
    session_id: str = Field(min_length=8, max_length=64)
    annotator_name: str = Field(default="", max_length=128)
    annotator_email: str = Field(default="", max_length=256)
    annotator_profession: str = Field(default="", max_length=256)
    annotator_linkedin: str = Field(default="", max_length=512)
    annotations: list[StudyAnnotationItem] = Field(min_length=1)


class StudyAnnotationsResponse(BaseModel):
    saved: int
    session_id: str

