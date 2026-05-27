from collections import defaultdict

from fastapi import APIRouter, Depends
from sqlalchemy import extract
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Transaction, Budget, Income, Category, User
from app.schemas.summary import SummaryOut, CategorySpending

router = APIRouter(prefix="/api/summary", tags=["summary"])


@router.get("/{month}/{year}", response_model=SummaryOut)
def get_summary(month: int, year: int, db: Session = Depends(get_db)):
    # Income
    incomes = db.query(Income).filter(Income.month == month, Income.year == year).all()
    total_income = sum(i.amount for i in incomes)

    # Transactions
    transactions = (
        db.query(Transaction)
        .filter(
            extract("month", Transaction.date) == month,
            extract("year", Transaction.date) == year,
        )
        .all()
    )
    total_spent = sum(t.amount for t in transactions)

    # Spending per category
    cat_spending: dict[int, float] = defaultdict(float)
    for t in transactions:
        cat_spending[t.category_id] += t.amount

    # Budgets for this month
    budgets = db.query(Budget).filter(Budget.month == month, Budget.year == year).all()
    budget_map = {b.category_id: b.amount_limit for b in budgets}

    # All categories for complete picture
    categories = db.query(Category).all()
    cat_map = {c.id: c for c in categories}

    by_category = []
    for cat in categories:
        spent = cat_spending.get(cat.id, 0.0)
        if spent > 0 or cat.id in budget_map:
            by_category.append(
                CategorySpending(
                    category_id=cat.id,
                    category_name=cat.name,
                    color=cat.color,
                    spent=round(spent, 2),
                    budget_limit=budget_map.get(cat.id),
                )
            )

    # Balance between users: tracks how much each user has overpaid on split expenses
    users = db.query(User).all()
    user_map = {u.id: u.name for u in users}
    net: dict[str, float] = {u.name: 0.0 for u in users}
    for t in transactions:
        payer = user_map[t.paid_by]
        if t.is_split:
            share = t.amount / len(users)
            for name in net:
                if name == payer:
                    net[name] += t.amount - share  # paid more than their share
                else:
                    net[name] -= share  # owes this much
        # Non-split: full cost on the payer, no balance effect

    balance = {name: round(val, 2) for name, val in net.items()}

    return SummaryOut(
        month=month,
        year=year,
        total_income=round(total_income, 2),
        total_spent=round(total_spent, 2),
        remaining=round(total_income - total_spent, 2),
        balance_between_users=balance,
        by_category=by_category,
    )
