from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database.models import AnalysisRun, TraceEventRecord
from app.database.session import get_db
from app.models.schemas import AnalyzeRequest, AnalyzeResponse
from app.services.analyzer_rule import rule_based_prediction
from app.services.llm_judge import llm_based_prediction
from app.services.metrics import compute_metrics
from app.services.insights import (
    build_disagreement,
    build_evidence,
    build_recommendation,
    enrich_prediction_reasons,
)
from app.services.storage import save_analysis
from app.services.trace_logger import normalize_trace

router = APIRouter()


@router.get("/health")
def health() -> dict:
    return {"service": "llmsheriff-backend", "status": "healthy"}


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_intent(
    payload: AnalyzeRequest, db: Session = Depends(get_db)
) -> AnalyzeResponse:
    normalized_trace = normalize_trace(payload.trace)
    metrics = compute_metrics(normalized_trace)
    evidence = build_evidence(normalized_trace, metrics)
    rule_prediction = enrich_prediction_reasons(
        rule_based_prediction(metrics), normalized_trace, metrics
    )
    llm_prediction = enrich_prediction_reasons(
        await llm_based_prediction(normalized_trace, metrics), normalized_trace, metrics
    )
    recommendation = build_recommendation(metrics, rule_prediction, llm_prediction)
    disagreement = build_disagreement(
        rule_prediction, llm_prediction, normalized_trace, metrics
    )
    run = save_analysis(db, payload, metrics, rule_prediction, llm_prediction)

    return AnalyzeResponse(
        task_id=payload.task_id,
        run_id=run.id,
        metrics=metrics,
        evidence=evidence,
        rule_engine=rule_prediction,
        llm_engine=llm_prediction,
        recommendation=recommendation,
        disagreement=disagreement,
    )


@router.get("/runs")
def list_runs(db: Session = Depends(get_db)) -> list[dict]:
    rows = db.execute(select(AnalysisRun).order_by(AnalysisRun.id.desc()).limit(20)).scalars()
    return [
        {
            "id": row.id,
            "task_id": row.task_id,
            "created_at": row.created_at.isoformat(),
            "rule_state": row.rule_state,
            "llm_state": row.llm_state,
            "progress_score": row.progress_score,
        }
        for row in rows
    ]


@router.get("/runs/{run_id}")
def get_run_details(run_id: int, db: Session = Depends(get_db)) -> dict:
    run = db.get(AnalysisRun, run_id)
    if run is None:
        raise HTTPException(status_code=404, detail="Run not found")

    events = db.execute(
        select(TraceEventRecord)
        .where(TraceEventRecord.run_id == run_id)
        .order_by(TraceEventRecord.timestamp.asc())
    ).scalars()

    return {
        "id": run.id,
        "task_id": run.task_id,
        "user_prompt": run.user_prompt,
        "current_goal": run.current_goal,
        "created_at": run.created_at.isoformat(),
        "runtime_seconds": run.runtime_seconds,
        "progress_score": run.progress_score,
        "rule_state": run.rule_state,
        "rule_confidence": run.rule_confidence,
        "llm_state": run.llm_state,
        "llm_confidence": run.llm_confidence,
        "events": [
            {
                "id": event.id,
                "timestamp": event.timestamp.isoformat(),
                "step": event.step,
                "action": event.action,
                "duration": event.duration,
                "status": event.status,
            }
            for event in events
        ],
    }
