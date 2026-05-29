import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import auth, transactions, budgets, categories, income, summary, users, recurring, trends, savings

load_dotenv()

LOCAL_DEV_ORIGIN = "http://localhost:5173"
_raw_origins = os.getenv("CORS_ORIGINS", "")
_configured = [o.strip() for o in _raw_origins.split(",") if o.strip()]
# Always allow the local dev frontend, even when CORS_ORIGINS is set for prod.
allow_origins = list(dict.fromkeys([*_configured, LOCAL_DEV_ORIGIN]))

app = FastAPI(title="BudgetBuddy API", version="0.1.0")

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
