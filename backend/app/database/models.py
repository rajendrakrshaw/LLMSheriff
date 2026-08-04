from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.session import Base


class AnalysisRun(Base):
    __tablename__ = "analysis_runs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    task_id: Mapped[str] = mapped_column(String(128), index=True)
    user_prompt: Mapped[str] = mapped_column(Text)
    current_goal: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime)
    runtime_seconds: Mapped[float] = mapped_column(Float)
    progress_score: Mapped[float] = mapped_column(Float)
    rule_state: Mapped[str] = mapped_column(String(32))
    rule_confidence: Mapped[float] = mapped_column(Float)
    llm_state: Mapped[str] = mapped_column(String(32))
    llm_confidence: Mapped[float] = mapped_column(Float)

    events: Mapped[list["TraceEventRecord"]] = relationship(
        "TraceEventRecord", back_populates="run", cascade="all, delete-orphan"
    )


class TraceEventRecord(Base):
    __tablename__ = "trace_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    run_id: Mapped[int] = mapped_column(ForeignKey("analysis_runs.id"), index=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime)
    step: Mapped[str] = mapped_column(String(128))
    action: Mapped[str] = mapped_column(Text)
    duration: Mapped[float] = mapped_column(Float)
    status: Mapped[str] = mapped_column(String(24))

    run: Mapped[AnalysisRun] = relationship("AnalysisRun", back_populates="events")


class AnnotationLabel(Base):
    __tablename__ = "annotation_labels"
    __table_args__ = (
        UniqueConstraint("session_id", "trace_id", name="uq_annotation_session_trace"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    session_id: Mapped[str] = mapped_column(String(64), index=True)
    annotator_name: Mapped[str] = mapped_column(String(128), default="")
    trace_id: Mapped[str] = mapped_column(String(16), index=True)
    state: Mapped[str] = mapped_column(String(32))
    confidence: Mapped[int | None] = mapped_column(Integer, nullable=True)
    notes: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime)
