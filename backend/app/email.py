"""Transactional email via Resend (https://resend.com).

If RESEND_API_KEY is unset (e.g. local dev), emails are logged and skipped so
flows still work end-to-end without a key. The reset/invite tokens are also
returned by their endpoints in that case so they remain testable.
"""
import logging
import os

from dotenv import load_dotenv

# override=False: never let a local .env clobber variables the platform
# (e.g. Railway) has already injected into the environment.
load_dotenv(override=False)

logger = logging.getLogger("budgetbuddy.email")

RESEND_API_KEY = os.getenv("RESEND_API_KEY")
# Resend's shared sandbox sender works without verifying a domain.
FROM_EMAIL = os.getenv("RESEND_FROM_EMAIL", "BudgetBuddy <onboarding@resend.dev>")
FRONTEND_URL = os.getenv(
    "FRONTEND_URL", "https://budget-buddy-lovat-nine.vercel.app"
).rstrip("/")


def send_email(to: str, subject: str, html: str) -> bool:
    """Send an email. Returns True if handed off to Resend, False otherwise."""
    if not RESEND_API_KEY:
        logger.warning(
            "RESEND_API_KEY not set — skipping email to %s (subject: %s)", to, subject
        )
        return False
    try:
        import resend

        resend.api_key = RESEND_API_KEY
        resend.Emails.send(
            {"from": FROM_EMAIL, "to": [to], "subject": subject, "html": html}
        )
        return True
    except Exception as exc:  # pragma: no cover - network/SDK errors
        logger.error("Failed to send email to %s: %s", to, exc)
        return False


def _button(href: str, label: str) -> str:
    return (
        f'<a href="{href}" style="display:inline-block;background:#10b981;color:#fff;'
        'text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600;'
        f'font-family:sans-serif;font-size:14px">{label}</a>'
    )


def send_password_reset_email(to: str, token: str) -> bool:
    link = f"{FRONTEND_URL}/reset-password?token={token}"
    html = f"""
    <div style="font-family:sans-serif;max-width:480px;margin:auto;color:#111">
      <h2 style="color:#111">Reset your BudgetBuddy password</h2>
      <p style="color:#555;line-height:1.5">
        We received a request to reset your password. This link expires in 1 hour.
        If you didn't request this, you can safely ignore this email.
      </p>
      <p style="margin:24px 0">{_button(link, 'Reset password')}</p>
      <p style="color:#888;font-size:12px;word-break:break-all">{link}</p>
    </div>
    """
    return send_email(to, "Reset your BudgetBuddy password", html)


def send_invite_email(to: str, token: str, inviter_name: str) -> bool:
    link = f"{FRONTEND_URL}/accept-invite?token={token}"
    html = f"""
    <div style="font-family:sans-serif;max-width:480px;margin:auto;color:#111">
      <h2 style="color:#111">{inviter_name} invited you to BudgetBuddy</h2>
      <p style="color:#555;line-height:1.5">
        You've been invited to share a BudgetBuddy account and manage finances
        together. This invite expires in 48 hours.
      </p>
      <p style="margin:24px 0">{_button(link, 'Accept invite')}</p>
      <p style="color:#888;font-size:12px;word-break:break-all">{link}</p>
    </div>
    """
    return send_email(to, f"{inviter_name} invited you to BudgetBuddy", html)
