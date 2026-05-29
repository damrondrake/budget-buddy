from collections import defaultdict

from fastapi import APIRouter, Depends
from sqlalchemy import extract, func
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth import get_current_account
from app.models import Transaction, Budget, Income, Category, User
from app.models.account import Account
from app.schemas.summary import SummaryOut, CategorySpending, CumulativeOut

router = APIRouter(prefix="/api/summary", tags=["summary"])
cumulative_router = APIRouter(prefix="/api/cumulative", tags=["cumulative"])


@cumulative_router.get("", response_model=CumulativeOut)
def get_cumulative(
    db: Session = Depends(get_db),
    account: Account = Depends(get_current_account),
):
    total_income = (
        db.query(func.coalesce(func.sum(Income.amount), 0.0))
        .filter(Income.account_id == account.id)
        .scalar()
    )
    total_spending = (
        db.query(func.coalesce(func.sum(Transaction.amount), 0.0))
        .filter(Transaction.account_id == account.id)
        .scalar()
    )
    return CumulativeOut(
        total_income=round(float(total_income), 2),
        total_spending=round(float(total_spending), 2),
        net_balance=round(float(total_income) - float(total_spending), 2),
    )


@router.get("/{month}/{year}", response_model=SummaryOut)
def get_summary(
    month: int,
    year: int,
    db: Session = Depends(get_db),
    account: Account = Depends(get_current_account),
):
    incomes = db.query(Income).filter(
        Income.account_id == account.id, Income.month == month, Income.year == year
    ).all()
    total_income = sum(i.amount for i in incomes)

    transactions = (
        db.query(Transaction)
        .filter(
            Transaction.account_id == account.id,
            extract("month", Transaction.date) == month,
            extract("year", Transaction.date) == year,
        )
        .all()
    )
    total_spent = sum(t.amount for t in transactions)

    cat_spending: dict[int, float] = defaultdict(float)
    for t in transactions:
        cat_spending[t.category_id] += t.amount

    budgets = db.query(Budget).filter(
        Budget.account_id == account.id, Budget.month == month, Budget.year == year
    ).all()
    budget_map = {b.category_id: b.amount_limit for b in budgets}

    categories = db.query(Category).filter(Category.account_id == account.id).all()

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

    users = db.query(User).filter(User.account_id == account.id).all()
    user_map = {u.id: u.name for u in users}
    net: dict[str, float] = {u.name: 0.0 for u in users}
    for t in transactions:
        payer = user_map[t.paid_by]
        if t.is_split:
            share = t.amount / len(users)
            for name in net:
                if name == payer:
                    net[name] += t.amount - share
                else:
                    net[name] -= share

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
