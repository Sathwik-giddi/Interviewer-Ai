"""
Email Service — Real email sending via Resend API.
No fallbacks, no console-only mode. If Resend fails, it raises an error.

Docs: https://resend.com/docs/api-reference/emails/send-email

Environment variables (set in backend/.env):
    RESEND_API_KEY     — your Resend API key (starts with re_)
    FROM_EMAIL         — verified sender (default: onboarding@resend.dev)
    REPLY_TO_EMAIL     — reply-to address (e.g. your personal gmail)
"""

import os
import requests

# ── Config ────────────────────────────────────────────────────────────────
RESEND_API_KEY = os.getenv('RESEND_API_KEY', '')
FROM_EMAIL = os.getenv('FROM_EMAIL', 'AI Interviewer <onboarding@resend.dev>')
REPLY_TO_EMAIL = os.getenv('REPLY_TO_EMAIL', '')

RESEND_ENDPOINT = 'https://api.resend.com/emails'


def send_email(to: str, subject: str, body_html: str) -> dict:
    """
    Send a real email via Resend API.

    Args:
        to         — recipient email address
        subject    — email subject line
        body_html  — HTML body content

    Returns:
        { "sent": True, "id": "<resend-email-id>" }

    Raises:
        ValueError  — if RESEND_API_KEY is not configured
        RuntimeError — if Resend API returns an error
    """

    if not RESEND_API_KEY:
        raise ValueError(
            "RESEND_API_KEY is not set. Add it to backend/.env — "
            "get your key from https://resend.com/api-keys"
        )

    payload = {
        "from": FROM_EMAIL,
        "to": [to],
        "subject": subject,
        "html": body_html,
    }

    # Add reply-to if configured
    if REPLY_TO_EMAIL:
        payload["reply_to"] = REPLY_TO_EMAIL

    headers = {
        "Authorization": f"Bearer {RESEND_API_KEY}",
        "Content-Type": "application/json",
    }

    response = requests.post(RESEND_ENDPOINT, json=payload, headers=headers, timeout=15)

    if response.status_code in (200, 201):
        data = response.json()
        email_id = data.get("id", "unknown")
        print(f"[RESEND] Email sent to {to} — id: {email_id}")
        return {"sent": True, "id": email_id, "method": "resend"}

    # ── Handle errors ──
    error_body = {}
    try:
        error_body = response.json()
    except Exception:
        pass

    error_msg = error_body.get("message", response.text[:200])
    print(f"[RESEND] FAILED ({response.status_code}): {error_msg}")
    raise RuntimeError(f"Resend API error ({response.status_code}): {error_msg}")


def build_interview_email(candidate_name: str, link: str, job_title: str = '',
                          note: str = '', is_mock: bool = False) -> str:
    """Build a styled HTML email for interview invitation."""
    type_label = "Mock Interview" if is_mock else "Interview"
    title_line = f"for <strong>{job_title}</strong>" if job_title else ""
    note_section = (
        f'<div style="margin:20px 0 0;padding:14px 16px;background:#f9fafb;'
        f'border-left:3px solid #7353F6;font-size:13px;color:#4b5563;">'
        f'<strong>Note from HR:</strong> {note}</div>'
        if note else ''
    )
    name_greeting = f" {candidate_name}" if candidate_name else ""

    return f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#f5f3ff;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;">

    <!-- Header -->
    <div style="background:#7353F6;padding:36px 24px;text-align:center;">
      <h1 style="color:#ffffff;font-size:26px;margin:0;letter-spacing:0.04em;font-family:Arial,sans-serif;">
        AI VIDEO INTERVIEWER
      </h1>
      <p style="color:rgba(255,255,255,0.85);font-size:14px;margin:10px 0 0;">
        Your {type_label} is Ready
      </p>
    </div>

    <!-- Body -->
    <div style="padding:36px 28px;">
      <p style="font-size:17px;color:#1a1a2e;margin:0 0 16px;">
        Hi{name_greeting},
      </p>
      <p style="font-size:14px;color:#4b5563;line-height:1.75;margin:0 0 24px;">
        You have been invited to an <strong>{type_label}</strong> {title_line}.
        Click the button below to begin when you are ready.
        The AI interviewer will ask you questions by voice — make sure your
        microphone and camera are working.
      </p>

      <!-- CTA Button -->
      <div style="text-align:center;margin:32px 0;">
        <a href="{link}"
           style="display:inline-block;background:#7353F6;color:#ffffff;
                  padding:16px 48px;font-size:16px;font-weight:700;
                  text-decoration:none;letter-spacing:0.03em;">
          Start {type_label}
        </a>
      </div>

      <!-- Link fallback -->
      <p style="font-size:12px;color:#9ca3af;text-align:center;margin:0 0 8px;">
        Or copy and paste this URL into your browser:
      </p>
      <p style="text-align:center;margin:0 0 24px;">
        <a href="{link}" style="color:#7353F6;font-size:13px;word-break:break-all;">
          {link}
        </a>
      </p>

      {note_section}

      <!-- Tips -->
      <div style="margin:28px 0 0;padding:16px;background:#f5f3ff;border:1px solid #e5e7eb;">
        <p style="font-size:12px;font-weight:700;color:#7353F6;margin:0 0 8px;text-transform:uppercase;letter-spacing:0.06em;">
          Before you start
        </p>
        <ul style="margin:0;padding:0 0 0 18px;font-size:13px;color:#4b5563;line-height:1.8;">
          <li>Use Chrome or Edge for the best experience</li>
          <li>Allow camera and microphone access when prompted</li>
          <li>Find a quiet, well-lit space</li>
          <li>Do not switch tabs during the interview (proctoring is active)</li>
        </ul>
      </div>
    </div>

    <!-- Footer -->
    <div style="background:#f9fafb;padding:20px 24px;text-align:center;border-top:1px solid #e5e7eb;">
      <p style="font-size:11px;color:#9ca3af;margin:0;">
        Powered by AI Video Interviewer &middot; Team Zero
      </p>
    </div>

  </div>
</body>
</html>"""
