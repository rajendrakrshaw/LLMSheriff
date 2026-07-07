from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database.models import AnalysisRun
from app.database.session import get_db
from app.models.schemas import AnalyzeRequest, AnalyzeResponse
from app.services.analyzer_rule import rule_based_prediction
from app.services.llm_judge import llm_based_prediction
from app.services.metrics import compute_metrics
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
    rule_prediction = rule_based_prediction(metrics)
    llm_prediction = await llm_based_prediction(normalized_trace, metrics)
    run = save_analysis(db, payload, metrics, rule_prediction, llm_prediction)

    return AnalyzeResponse(
        task_id=payload.task_id,
        run_id=run.id,
        metrics=metrics,
        rule_engine=rule_prediction,
        llm_engine=llm_prediction,
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
