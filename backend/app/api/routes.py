from datetime import datetime, timezone
import csv
import io
import json

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from fastapi.responses import PlainTextResponse, StreamingResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import DATA_DIR, settings
from app.database.models import AnalysisRun, AnnotationLabel, TraceEventRecord
from app.database.session import get_db
from app.models.schemas import (
    AnalyzeRequest,
    AnalyzeResponse,
    StudyAnnotationsRequest,
    StudyAnnotationsResponse,
    StudyTrace,
    StudyTracesResponse,
)
from app.services.analyzer_rule import rule_based_prediction
from app.services.insights import (
    build_disagreement,
    build_evidence,
    build_recommendation,
    enrich_prediction_reasons,
)
from app.services.llm_judge import llm_based_prediction
from app.services.metrics import compute_metrics
from app.services.storage import save_analysis
from app.services.study_traces import ALLOWED_STATES, load_study_traces
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


@router.get("/study/traces", response_model=StudyTracesResponse)
def study_traces() -> StudyTracesResponse:
    try:
        traces = load_study_traces()
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return StudyTracesResponse(
        states=ALLOWED_STATES,
        traces=[StudyTrace(**item) for item in traces],
        count=len(traces),
    )


@router.get("/study/rubric", response_class=PlainTextResponse)
def study_rubric() -> str:
    candidates = [
        DATA_DIR.parent / "study_assets" / "RUBRIC.md",
        DATA_DIR.parent.parent / "paper" / "human_study" / "RUBRIC.md",
    ]
    for path in candidates:
        if path.is_file():
            return path.read_text(encoding="utf-8")
    return (
        "Pick ONE state per trace: Completed, Recovering, Waiting, Stalled, Abandoned "
        "(also Planning, Executing, Failed if needed).\n"
        "Waiting = external poll/pending. Stalled = tight repeated work loop. "
        "Abandoned = long idle drift."
    )


def _append_jsonl(payload: dict) -> None:
    path = DATA_DIR / "study_annotations.jsonl"
    with path.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(payload, ensure_ascii=False) + "\n")


@router.post("/study/annotations", response_model=StudyAnnotationsResponse)
def save_study_annotations(
    payload: StudyAnnotationsRequest, db: Session = Depends(get_db)
) -> StudyAnnotationsResponse:
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    try:
        valid_ids = {item["trace_id"] for item in load_study_traces()}
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    saved = 0
    for item in payload.annotations:
        if item.trace_id not in valid_ids:
            raise HTTPException(status_code=400, detail=f"Unknown trace_id: {item.trace_id}")
        if item.state not in ALLOWED_STATES:
            raise HTTPException(status_code=400, detail=f"Invalid state: {item.state}")

        existing = db.execute(
            select(AnnotationLabel).where(
                AnnotationLabel.session_id == payload.session_id,
                AnnotationLabel.trace_id == item.trace_id,
            )
        ).scalar_one_or_none()

        if existing is None:
            db.add(
                AnnotationLabel(
                    session_id=payload.session_id,
                    annotator_name=payload.annotator_name.strip()[:128],
                    trace_id=item.trace_id,
                    state=item.state,
                    confidence=item.confidence,
                    notes=item.notes.strip(),
                    created_at=now,
                )
            )
        else:
            existing.annotator_name = payload.annotator_name.strip()[:128]
            existing.state = item.state
            existing.confidence = item.confidence
            existing.notes = item.notes.strip()
            existing.created_at = now

        _append_jsonl(
            {
                "session_id": payload.session_id,
                "annotator_name": payload.annotator_name.strip()[:128],
                "trace_id": item.trace_id,
                "state": item.state,
                "confidence": item.confidence,
                "notes": item.notes.strip(),
                "created_at": now.isoformat() + "Z",
            }
        )
        saved += 1

    db.commit()
    return StudyAnnotationsResponse(saved=saved, session_id=payload.session_id)


@router.get("/study/export.csv")
def export_study_annotations(
    token: str = Query(default=""),
    x_study_token: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> StreamingResponse:
    provided = token or (x_study_token or "")
    if not provided or provided != settings.study_export_token:
        raise HTTPException(status_code=401, detail="Invalid study export token")

    rows = (
        db.execute(
            select(AnnotationLabel).order_by(
                AnnotationLabel.annotator_name.asc(),
                AnnotationLabel.session_id.asc(),
                AnnotationLabel.trace_id.asc(),
            )
        )
        .scalars()
        .all()
    )

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(
        [
            "trace_id",
            "annotator_id",
            "state",
            "confidence_1_to_5",
            "notes",
            "session_id",
            "created_at",
        ]
    )
    for row in rows:
        annotator = row.annotator_name or row.session_id[:8]
        writer.writerow(
            [
                row.trace_id,
                annotator,
                row.state,
                row.confidence if row.confidence is not None else "",
                row.notes,
                row.session_id,
                row.created_at.isoformat(),
            ]
        )

    buffer.seek(0)
    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=study_annotations.csv"},
    )
