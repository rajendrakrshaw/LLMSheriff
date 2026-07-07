from datetime import datetime

from sqlalchemy.orm import Session

from app.database.models import AnalysisRun, TraceEventRecord
from app.models.schemas import AnalyzeRequest, Prediction


def save_analysis(
    db: Session,
    payload: AnalyzeRequest,
    metrics: dict,
    rule_prediction: Prediction,
    llm_prediction: Prediction,
) -> AnalysisRun:
    run = AnalysisRun(
        task_id=payload.task_id,
        user_prompt=payload.user_prompt,
        current_goal=payload.current_goal,
        created_at=datetime.utcnow(),
        runtime_seconds=metrics.get("runtime_seconds", 0.0),
        progress_score=metrics.get("progress_score", 0.0),
        rule_state=rule_prediction.state,
        rule_confidence=rule_prediction.confidence,
        llm_state=llm_prediction.state,
        llm_confidence=llm_prediction.confidence,
    )
    db.add(run)
    db.flush()

    for event in payload.trace:
        db.add(
            TraceEventRecord(
                run_id=run.id,
                timestamp=event.timestamp,
                step=event.step,
                action=event.action,
                duration=event.duration,
                status=event.status,
            )
        )

    db.commit()
    db.refresh(run)
    return run
