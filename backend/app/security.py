"""Shared security primitives: rate limiting and security-event logging.

Kept in its own module so routers and ``app.main`` can both import the single
``limiter`` instance without creating an import cycle.
"""
import logging

from slowapi import Limiter
from slowapi.util import get_remote_address
from starlette.requests import Request

# Dedicated logger for auth/security events (failed logins, registrations,
# password resets). Routed through uvicorn's logger so it surfaces in the
# platform's (Railway) deploy logs alongside request logs.
security_logger = logging.getLogger("uvicorn.error")


def client_ip(request: Request) -> str:
    """Best-effort client IP for per-IP rate limiting.

    The app runs behind Railway's proxy, so ``request.client.host`` is the
    proxy, not the caller. Prefer the first hop in ``X-Forwarded-For`` so the
    limit is keyed on the real client; fall back to the socket peer locally.
    """
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return get_remote_address(request)


# Single limiter instance shared across the app. Per-route limits are applied
# with ``@limiter.limit(...)`` decorators; there is no global default limit.
limiter = Limiter(key_func=client_ip)


def log_security_event(event: str, request: Request, **fields) -> None:
    """Emit a structured-ish security log line.

    Logs the event, the client IP, and any extra context (e.g. the email an
    attempt was made against). Never logs passwords, tokens, or secrets.
    """
    context = " ".join(f"{k}={v}" for k, v in fields.items())
    security_logger.info(
        "SECURITY event=%s ip=%s %s", event, client_ip(request), context
    )
