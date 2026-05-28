import calendar
from collections import defaultdict
from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy import extract
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth import get_current_account
from app.models import Transaction, Income, Category
from app.models.account import Account
from app.schemas.trends import TrendsOut, MonthData, CategoryMonthSpending

router = APIRouter(prefix="/api/trends", tags=["trends"])


@router.get("", response_model=TrendsOut)
def get_trends(
    months: int = Query(6, ge=1, le=24),
    db: Session = Depends(get_db),
    account: Account = Depends(get_current_account),
):
    today = date.today()
    periods = []
    for i in range(months - 1, -1, -1):
        m = today.month - i
        y = today.year
        while m <= 0:
            m += 12
            y -= 1
        periods.append((m, y))

    categories = db.query(Category).filter(Category.account_id == account.id).all()
    cat_map = {c.id: c for c in categories}

    result = []
    for m, y in periods:
        txns = (
            db.query(Transaction)
            .filter(
                Transaction.account_id == account.id,
                extract("month", Transaction.date) == m,
                extract("year", Transaction.date) == y,
            )
            .all()
        )
        incomes = db.query(Income).filter(
            Income.account_id == account.id, Income.month == m, Income.year == y
        ).all()

        total_spent = sum(t.amount for t in txns)
        total_income = sum(i.amount for i in incomes)

        cat_spending: dict[int, float] = defaultdict(float)
        for t in txns:
            cat_spending[t.category_id] += t.amount

        cat_list = []
        for cat_id, amount in sorted(cat_spending.items(), key=lambda x: -x[1]):
            cat = cat_map.get(cat_id)
            if cat:
                cat_list.append(CategoryMonthSpending(
                    category_id=cat_id,
                    category_name=cat.name,
                    color=cat.color,
                    amount=round(amount, 2),
                ))

        label = f"{calendar.month_abbr[m]} {y}"
        result.append(MonthData(
            month=m,
            year=y,
            label=label,
            total_spent=round(total_spent, 2),
            total_income=round(total_income, 2),
            categories=cat_list,
        ))

    return TrendsOut(months=result)
