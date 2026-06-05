import logging
import os
from contextlib import asynccontextmanager

import sentry_sdk
from dotenv import load_dotenv
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.starlette import StarletteIntegration
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

from app.email import get_resend_api_key, get_frontend_url
from app.routers import auth, transactions, budgets, categories, income, summary, users, recurring, trends, savings, account, changelog, billing, settlements, shared_goals
from app.security import limiter

# override=False so platform-injected env vars (Railway) always win over any .env file.
load_dotenv(override=False)

# Log via uvicorn's logger so this shows up in Railway's deploy logs.
_log = logging.getLogger("uvicorn.error")

# Initialize Sentry before the app is created so its FastAPI/Starlette
# middleware wraps every request. Only when SENTRY_DSN is set, so local dev
# isn't reported. Unhandled exceptions are captured with full request context.
SENTRY_DSN = os.getenv("SENTRY_DSN")
if SENTRY_DSN:
    sentry_sdk.init(
        dsn=SENTRY_DSN,
        # Attach request headers and user IP to events for richer context.
        # See https://docs.sentry.io/platforms/python/data-management/data-collected/
        send_default_pii=True,
        traces_sample_rate=0.1,
        environment=os.getenv("ENVIRONMENT", "production"),
        integrations=[
            StarletteIntegration(),
            FastApiIntegration(),
        ],
    )
    _log.info("Sentry error tracking enabled.")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Dump the NAMES (never values) of every env var starting with RESEND, so we
    # can see exactly what Railway named the variable (typo/whitespace/casing).
    resend_keys = sorted(k for k in os.environ if k.upper().startswith("RESEND"))
    _log.info("Env keys starting with 'RESEND': %s", resend_keys or "(none)")

    resend_api_key = get_resend_api_key()
    # Report presence of email config as booleans only — never log any part of
    # the secret value (not even a prefix or its length).
    _log.info(
        "Email config at startup - RESEND_API_KEY set: %s | "
        "RESEND_FROM_EMAIL set: %s | FRONTEND_URL: %s",
        bool(resend_api_key),
        bool(os.getenv("RESEND_FROM_EMAIL")),
        get_frontend_url(),
    )
    if not resend_api_key:
        _log.warning(
            "RESEND_API_KEY is NOT set - password-reset and invite emails will be "
            "skipped (endpoints still return 200). Set it in Railway -> backend "
            "service -> Variables to enable email."
        )
    yield

LOCAL_DEV_ORIGIN = "http://localhost:5173"
_raw_origins = os.getenv("CORS_ORIGINS", "")
_configured = [o.strip() for o in _raw_origins.split(",") if o.strip()]
# Always allow the local dev frontend, even when CORS_ORIGINS is set for prod.
allow_origins = list(dict.fromkeys([*_configured, LOCAL_DEV_ORIGIN]))

app = FastAPI(title="BudgetBuddy API", version="0.1.0", lifespan=lifespan)

# --- Rate limiting (slowapi) ------------------------------------------------
# Per-route limits are declared with @limiter.limit(...) on sensitive auth
# endpoints. Register the shared limiter and a handler that returns 429.
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)


# --- Security headers -------------------------------------------------------
# Applied to every response. Sent on API (JSON) responses; the frontend ships
# its own header set via vercel.json for the static app.
SECURITY_HEADERS = {
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    "Content-Security-Policy": (
        "default-src 'self'; script-src 'self' 'unsafe-inline'; "
        "style-src 'self' 'unsafe-inline'; img-src 'self' data:"
    ),
}


@app.middleware("http")
async def set_security_headers(request: Request, call_next) -> Response:
    response = await call_next(request)
    for header, value in SECURITY_HEADERS.items():
        response.headers[header] = value
    return response


app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Database error handling ------------------------------------------------
# Never surface a raw SQLAlchemy/DB error (which can leak table names, SQL, or
# connection details) to the client. Log the detail server-side and return a
# clean, generic response. IntegrityError (unique/FK/constraint violations)
# maps to 409 Conflict; any other DB error maps to 400 Bad Request.
@app.exception_handler(IntegrityError)
async def handle_integrity_error(request: Request, exc: IntegrityError) -> JSONResponse:
    _log.warning("IntegrityError on %s %s: %s", request.method, request.url.path, exc)
    return JSONResponse(
        status_code=409,
        content={"detail": "The request conflicts with existing data."},
    )


@app.exception_handler(SQLAlchemyError)
async def handle_database_error(request: Request, exc: SQLAlchemyError) -> JSONResponse:
    _log.error("Database error on %s %s: %s", request.method, request.url.path, exc)
    return JSONResponse(
        status_code=400,
        content={"detail": "The request could not be processed."},
    )


app.include_router(auth.router)
app.include_router(transactions.router)
app.include_router(budgets.router)
app.include_router(categories.router)
app.include_router(income.router)
app.include_router(summary.router)
app.include_router(summary.cumulative_router)
app.include_router(users.router)
app.include_router(recurring.router)
app.include_router(trends.router)
app.include_router(savings.router)
app.include_router(account.router)
app.include_router(changelog.router)
app.include_router(billing.router)
app.include_router(settlements.router)
app.include_router(shared_goals.router)


@app.get("/api/health")
def health_check():
    return {"status": "healthy", "app": "BudgetBuddy"}
