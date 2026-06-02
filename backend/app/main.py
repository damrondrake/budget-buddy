import logging
import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.email import get_resend_api_key, get_frontend_url
from app.routers import auth, transactions, budgets, categories, income, summary, users, recurring, trends, savings

# override=False so platform-injected env vars (Railway) always win over any .env file.
load_dotenv(override=False)

# Log via uvicorn's logger so this shows up in Railway's deploy logs.
_log = logging.getLogger("uvicorn.error")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Dump the NAMES (never values) of every env var starting with RESEND, so we
    # can see exactly what Railway named the variable (typo/whitespace/casing).
    resend_keys = sorted(k for k in os.environ if k.upper().startswith("RESEND"))
    _log.info("Env keys starting with 'RESEND': %s", resend_keys or "(none)")

    resend_api_key = get_resend_api_key()
    # Confirm which email-related env vars Railway is injecting, WITHOUT
    # ever printing the secret value of RESEND_API_KEY.
    _log.info(
        "Email config at startup - RESEND_API_KEY set: %s | "
        "RESEND_FROM_EMAIL set: %s | FRONTEND_URL: %s",
        bool(resend_api_key),
        bool(os.getenv("RESEND_FROM_EMAIL")),
        get_frontend_url(),
    )
    if resend_api_key:
        # Confirm Railway is injecting the right value: prefix only, never the
        # full secret. Logging length too surfaces stray whitespace/newlines.
        _log.info(
            "RESEND_API_KEY detected - prefix: %s... (length %d)",
            resend_api_key[:8],
            len(resend_api_key),
        )
    else:
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

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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


@app.get("/api/health")
def health_check():
    return {"status": "healthy", "app": "BudgetBuddy"}


@app.get("/api/debug/env")
def debug_env():
    """Diagnostics: report which expected env vars the process sees.

    Returns booleans only (presence + non-empty) — never the values — so it's
    safe to hit directly. Lets us confirm exactly what Railway is injecting.
    """
    names = [
        "RESEND_API_KEY",
        "RESEND_FROM_EMAIL",
        "FRONTEND_URL",
        "DATABASE_URL",
        "SECRET_KEY",
        "CORS_ORIGINS",
    ]
    return {name: bool(os.getenv(name)) for name in names}
