from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import transactions, budgets, categories, income, summary, users, recurring, trends

app = FastAPI(title="BudgetBuddy API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(transactions.router)
app.include_router(budgets.router)
app.include_router(categories.router)
app.include_router(income.router)
app.include_router(summary.router)
app.include_router(users.router)
app.include_router(recurring.router)
app.include_router(trends.router)


@app.get("/api/health")
def health_check():
    return {"status": "healthy", "app": "BudgetBuddy"}
