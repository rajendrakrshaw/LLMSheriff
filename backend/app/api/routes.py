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
    StudyCompleteRequest,
    StudyCompleteResponse,
    StudyResumeAnswer,
    StudyResumeRequest,
    StudyResumeResponse,
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
from app.services.study_mail import send_study_completion_email
from app.services.study_store import (
    append_annotation_jsonl,
    latest_jsonl_by_session_trace,
    read_annotation_jsonl,
)
from app.services.study_traces import ALLOWED_STATES, load_study_traces
from app.services.trace_logger import normalize_trace

router = APIRouter()


def _norm_email(value: str) -> str:
    return (value or "").strip().lower()


def _norm_name(value: str) -> str:
    return " ".join((value or "").strip().lower().split())


def _answers_from_jsonl_for_email(email: str, name: str = "") -> tuple[str, list[dict]]:
    """Return (session_id, answer dicts) from JSONL for email(/name), or ("", [])."""
    email_n = _norm_email(email)
    name_n = _norm_name(name)
    rows = latest_jsonl_by_session_trace(read_annotation_jsonl())
    matching = [r for r in rows if _norm_email(str(r.get("annotator_email") or "")) == email_n]
    if name_n:
        named = [r for r in matching if _norm_name(str(r.get("annotator_name") or "")) == name_n]
        if named:
            matching = named
    if not matching:
        return "", []

    by_session: dict[str, list[dict]] = {}
    for row in matching:
        sid = str(row.get("session_id") or "")
        by_session.setdefault(sid, []).append(row)

    def session_key(sid: str) -> tuple[int, str]:
        items = by_session[sid]
        latest = max((str(item.get("created_at") or "") for item in items), default="")
        return (len(items), latest)

    session_id = max(by_session.keys(), key=session_key)
    return session_id, by_session[session_id]


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
        DATA_DIR.parent / "study_assets" / "WEB_RUBRIC.md",
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


@router.post("/study/resume", response_model=StudyResumeResponse)
def resume_study(payload: StudyResumeRequest, db: Session = Depends(get_db)) -> StudyResumeResponse:
    email = _norm_email(payload.email)
    name = _norm_name(payload.name)
    if "@" not in email or "." not in email.split("@")[-1]:
        raise HTTPException(status_code=400, detail="Invalid email")

    try:
        traces = load_study_traces()
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    total = len(traces)
    trace_order = [item["trace_id"] for item in traces]

    rows = (
        db.execute(
            select(AnnotationLabel).where(AnnotationLabel.annotator_email != "")
        )
        .scalars()
        .all()
    )
    matching = [row for row in rows if _norm_email(getattr(row, "annotator_email", "") or "") == email]
    if name:
        named = [row for row in matching if _norm_name(row.annotator_name or "") == name]
        if named:
            matching = named

    session_id = ""
    latest_by_trace: dict[str, StudyResumeAnswer] = {}

    if matching:
        by_session: dict[str, list[AnnotationLabel]] = {}
        for row in matching:
            by_session.setdefault(row.session_id, []).append(row)

        def session_key(sid: str) -> tuple[int, str]:
            items = by_session[sid]
            latest = max((item.created_at.isoformat() for item in items), default="")
            return (len(items), latest)

        session_id = max(by_session.keys(), key=session_key)
        for row in sorted(by_session[session_id], key=lambda r: r.created_at.isoformat()):
            latest_by_trace[row.trace_id] = StudyResumeAnswer(
                trace_id=row.trace_id,
                state=row.state,
                confidence=row.confidence,
                notes=row.notes or "",
            )

    # Fallback / merge from JSONL (survives some SQLite issues within same instance)
    jsonl_session, jsonl_rows = _answers_from_jsonl_for_email(email, name)
    if jsonl_rows and (not latest_by_trace or len(jsonl_rows) >= len(latest_by_trace)):
        if not session_id:
            session_id = jsonl_session
        for row in jsonl_rows:
            tid = str(row.get("trace_id") or "")
            if not tid:
                continue
            conf = row.get("confidence")
            try:
                conf_i = int(conf) if conf is not None and conf != "" else None
            except (TypeError, ValueError):
                conf_i = None
            latest_by_trace[tid] = StudyResumeAnswer(
                trace_id=tid,
                state=str(row.get("state") or ""),
                confidence=conf_i,
                notes=str(row.get("notes") or ""),
            )

    if not latest_by_trace:
        return StudyResumeResponse(found=False, total_traces=total)

    answers = list(latest_by_trace.values())
    labeled_ids = set(latest_by_trace.keys())
    next_index = 0
    for i, tid in enumerate(trace_order):
        if tid not in labeled_ids:
            next_index = i
            break
    else:
        next_index = max(total - 1, 0)

    completed = total > 0 and len(labeled_ids) >= total
    return StudyResumeResponse(
        found=True,
        session_id=session_id or jsonl_session,
        answers=answers,
        next_index=next_index,
        labeled_count=len(labeled_ids),
        total_traces=total,
        completed=completed,
    )


@router.post("/study/complete", response_model=StudyCompleteResponse)
def complete_study(payload: StudyCompleteRequest) -> StudyCompleteResponse:
    emailed, detail = send_study_completion_email(
        to_email=payload.annotator_email,
        annotator_name=payload.annotator_name,
        labeled_count=payload.labeled_count,
        session_id=payload.session_id,
    )
    return StudyCompleteResponse(emailed=emailed, detail=detail)


def _append_jsonl(payload: dict) -> None:
    append_annotation_jsonl(payload)


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
                    annotator_email=_norm_email(payload.annotator_email)[:256],
                    annotator_profession=payload.annotator_profession.strip()[:256],
                    annotator_linkedin=payload.annotator_linkedin.strip()[:512],
                    trace_id=item.trace_id,
                    state=item.state,
                    confidence=item.confidence,
                    notes=item.notes.strip(),
                    created_at=now,
                )
            )
        else:
            existing.annotator_name = payload.annotator_name.strip()[:128]
            existing.annotator_email = _norm_email(payload.annotator_email)[:256]
            existing.annotator_profession = payload.annotator_profession.strip()[:256]
            existing.annotator_linkedin = payload.annotator_linkedin.strip()[:512]
            existing.state = item.state
            existing.confidence = item.confidence
            existing.notes = item.notes.strip()
            existing.created_at = now

        _append_jsonl(
            {
                "session_id": payload.session_id,
                "annotator_name": payload.annotator_name.strip()[:128],
                "annotator_email": _norm_email(payload.annotator_email)[:256],
                "annotator_profession": payload.annotator_profession.strip()[:256],
                "annotator_linkedin": payload.annotator_linkedin.strip()[:512],
                "trace_id": item.trace_id,
                "state": item.state,
                "confidence": item.confidence,
                "notes": item.notes.strip(),
                "created_at": now.isoformat() + "Z",
            }
        )
        if settings.study_webhook_url.strip():
            try:
                import httpx

                httpx.post(
                    settings.study_webhook_url.strip(),
                    json={
                        "session_id": payload.session_id,
                        "annotator_name": payload.annotator_name.strip()[:128],
                        "annotator_email": _norm_email(payload.annotator_email)[:256],
                        "trace_id": item.trace_id,
                        "state": item.state,
                        "confidence": item.confidence,
                        "notes": item.notes.strip(),
                        "created_at": now.isoformat() + "Z",
                    },
                    timeout=8.0,
                )
            except Exception:
                pass
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

    # Merge SQLite + JSONL (latest wins per session+trace)
    merged: dict[tuple[str, str], list] = {}

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
    for row in rows:
        key = (row.session_id, row.trace_id)
        merged[key] = [
            row.trace_id,
            row.annotator_name or row.session_id[:8],
            getattr(row, "annotator_email", "") or "",
            getattr(row, "annotator_profession", "") or "",
            getattr(row, "annotator_linkedin", "") or "",
            row.state,
            row.confidence if row.confidence is not None else "",
            row.notes,
            row.session_id,
            row.created_at.isoformat(),
        ]

    for item in latest_jsonl_by_session_trace(read_annotation_jsonl()):
        sid = str(item.get("session_id") or "")
        tid = str(item.get("trace_id") or "")
        key = (sid, tid)
        created = str(item.get("created_at") or "")
        # Prefer JSONL if newer or SQLite missing
        if key not in merged or created >= str(merged[key][9]):
            merged[key] = [
                tid,
                str(item.get("annotator_name") or sid[:8]),
                str(item.get("annotator_email") or ""),
                str(item.get("annotator_profession") or ""),
                str(item.get("annotator_linkedin") or ""),
                str(item.get("state") or ""),
                item.get("confidence") if item.get("confidence") is not None else "",
                str(item.get("notes") or ""),
                sid,
                created,
            ]

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(
        [
            "trace_id",
            "annotator_id",
            "email",
            "profession",
            "linkedin",
            "state",
            "confidence_1_to_5",
            "notes",
            "session_id",
            "created_at",
        ]
    )
    for key in sorted(merged.keys(), key=lambda k: (merged[k][1], k[0], k[1])):
        writer.writerow(merged[key])

    buffer.seek(0)
    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=study_annotations.csv"},
    )
