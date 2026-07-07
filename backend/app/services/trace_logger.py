from app.models.schemas import TraceEvent


def normalize_trace(trace: list[TraceEvent]) -> list[TraceEvent]:
    """
    Placeholder for future normalization:
    - event enrichment
    - deduplication
    - schema migration support
    """
    return sorted(trace, key=lambda event: event.timestamp)
