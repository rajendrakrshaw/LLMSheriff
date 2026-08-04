"""Send study completion emails via Resend when configured."""

from __future__ import annotations

import logging

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


def send_study_completion_email(
    *,
    to_email: str,
    annotator_name: str,
    labeled_count: int,
    session_id: str,
) -> tuple[bool, str]:
    """Return (ok, detail). No-op with a clear message if email is not configured."""
    to_email = (to_email or "").strip()
    if not to_email or "@" not in to_email:
        return False, "Invalid recipient email"

    if not settings.resend_api_key.strip():
        logger.warning("RESEND_API_KEY not set; skipping study completion email to %s", to_email)
        return False, "Email service not configured (set RESEND_API_KEY)"

    name = (annotator_name or "").strip() or "annotator"
    site = settings.study_site_url.rstrip("/")
    subject = "Thank you — LLMSheriff annotation study"
    text = (
        f"Hi {name},\n\n"
        f"Thank you for completing the LLMSheriff behavioral labeling study "
        f"({labeled_count} traces labeled).\n\n"
        f"You can reopen the study anytime at:\n{site}/study\n\n"
        f"If you return with the same name and email, you will continue from where you left off.\n\n"
        f"Session: {session_id[:8]}…\n\n"
        f"— LLMSheriff research team\n"
    )
    html = (
        f"<p>Hi {name},</p>"
        f"<p>Thank you for completing the <strong>LLMSheriff</strong> behavioral labeling study "
        f"({labeled_count} traces labeled).</p>"
        f"<p>You can reopen the study anytime at "
        f'<a href="{site}/study">{site}/study</a>.</p>'
        f"<p>If you return with the <strong>same name and email</strong>, you will continue "
        f"from where you left off.</p>"
        f"<p style='color:#666;font-size:12px'>Session: {session_id[:8]}…</p>"
        f"<p>— LLMSheriff research team</p>"
    )

    try:
        response = httpx.post(
            "https://api.resend.com/emails",
            headers={
                "Authorization": f"Bearer {settings.resend_api_key.strip()}",
                "Content-Type": "application/json",
            },
            json={
                "from": settings.study_from_email,
                "to": [to_email],
                "subject": subject,
                "text": text,
                "html": html,
            },
            timeout=20.0,
        )
        if response.status_code >= 400:
            detail = f"Resend error {response.status_code}: {response.text[:300]}"
            logger.error(detail)
            return False, detail
        return True, "sent"
    except Exception as exc:  # noqa: BLE001
        detail = f"Email send failed: {exc}"
        logger.exception(detail)
        return False, detail
