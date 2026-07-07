from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text
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
