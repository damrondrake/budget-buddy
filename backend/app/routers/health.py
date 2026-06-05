"""Financial Health Score.

A 0-100 snapshot built from five 20-point components: savings rate, budget
adherence, spending trend, goal progress, and settle up. The same per-month
computation powers both the single-score endpoint and the 6-month history used
by the Trends chart.
"""
import calendar
from collections import defaultdict
from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy import extract
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth import get_current_account
from app.models import (
    Budget,
    Income,
    SharedGoal,
    SharedGoalContribution,
    Settlement,
    Transaction,
    User,
)
from app.models.account import Account
from app.schemas.health import (
    HealthComponent,
    HealthScoreHistoryOut,
    HealthScoreOut,
    HealthScorePoint,
)

router = APIRouter(prefix="/api/health-score", tags=["health-score"])

MAX_PER_COMPONENT = 20


def _clamp(value: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, value))


def _prev_periods(month: int, year: int, count: int) -> list[tuple[int, int]]:
    """The `count` months immediately before (month, year), oldest first."""
    periods = []
    m, y = month, year
    for _ in range(count):
        m -= 1
        if m <= 0:
            m += 12
            y -= 1
        periods.append((m, y))
    return list(reversed(periods))


def _month_spending(db: Session, account_id: int, month: int, year: int) -> float:
    return sum(
        t.amount
        for t in db.query(Transaction)
        .filter(
            Transaction.account_id == account_id,
            extract("month", Transaction.date) == month,
            extract("year", Transaction.date) == year,
        )
        .all()
    )


def _split_balance_abs(db: Session, account_id: int, month: int, year: int) -> float:
    """Largest absolute net balance between users for the month, settlements
    included — mirrors the summary endpoint's balance math."""
    users = db.query(User).filter(User.account_id == account_id).all()
    if len(users) < 2:
        return 0.0
    user_map = {u.id: u.name for u in users}
    net: dict[str, float] = {u.name: 0.0 for u in users}

    txns = (
        db.query(Transaction)
        .filter(
            Transaction.account_id == account_id,
            extract("month", Transaction.date) == month,
            extract("year", Transaction.date) == year,
        )
        .all()
    )
    for t in txns:
        if t.is_split:
            payer = user_map[t.paid_by]
            share = t.amount / len(users)
            for name in net:
                net[name] += (t.amount - share) if name == payer else -share

    settlements = (
        db.query(Settlement)
        .filter(
            Settlement.account_id == account_id,
            extract("month", Settlement.date) == month,
            extract("year", Settlement.date) == year,
        )
        .all()
    )
    for s in settlements:
        payer = user_map.get(s.paid_by)
        payee = user_map.get(s.paid_to)
        if payer in net:
            net[payer] += s.amount
        if payee in net:
            net[payee] -= s.amount

    return max(abs(v) for v in net.values())


def _savings_rate(db, account_id, month, year):
    incomes = db.query(Income).filter(
        Income.account_id == account_id, Income.month == month, Income.year == year
    ).all()
    income = sum(i.amount for i in incomes)
    spending = _month_spending(db, account_id, month, year)
    if income <= 0:
        return 0.0, "No income recorded this month."
    saved_pct = max(0.0, (income - spending) / income * 100)
    # 20%+ saved earns full marks; scales linearly to 0 at 0% saved.
    score = _clamp(saved_pct, 0, MAX_PER_COMPONENT)
    return round(score, 1), f"You saved {round(saved_pct)}% of your income this month."


def _budget_adherence(db, account_id, month, year):
    budgets = db.query(Budget).filter(
        Budget.account_id == account_id, Budget.month == month, Budget.year == year
    ).all()

    def budget_total(b):
        return sum(li.amount for li in b.line_items) if b.line_items else b.amount_limit

    budgeted = [b for b in budgets if budget_total(b) > 0]
    if not budgeted:
        return float(MAX_PER_COMPONENT), "No budgets set for this month."

    cat_spending: dict[int, float] = defaultdict(float)
    for t in db.query(Transaction).filter(
        Transaction.account_id == account_id,
        extract("month", Transaction.date) == month,
        extract("year", Transaction.date) == year,
    ).all():
        cat_spending[t.category_id] += t.amount

    on_track = sum(
        1 for b in budgeted if cat_spending.get(b.category_id, 0.0) <= budget_total(b) + 0.005
    )
    score = on_track / len(budgeted) * MAX_PER_COMPONENT
    return round(score, 1), f"{on_track} of {len(budgeted)} budgeted categories on track."


def _spending_trend(db, account_id, month, year):
    current = _month_spending(db, account_id, month, year)
    prev = _prev_periods(month, year, 3)
    prev_totals = [_month_spending(db, account_id, m, y) for m, y in prev]
    avg = sum(prev_totals) / len(prev_totals) if prev_totals else 0.0
    if avg <= 0:
        return float(MAX_PER_COMPONENT), "Not enough history yet to spot a trend."
    pct_change = (current - avg) / avg * 100
    # Flat or down = full marks; +20% or worse = zero.
    score = _clamp(MAX_PER_COMPONENT - pct_change, 0, MAX_PER_COMPONENT)
    if pct_change <= 0:
        desc = f"Spending is down {round(abs(pct_change))}% vs your 3-month average."
    else:
        desc = f"Spending is up {round(pct_change)}% vs your 3-month average."
    return round(score, 1), desc


def _goal_progress(db, account_id, month, year):
    goals = db.query(SharedGoal).filter(SharedGoal.account_id == account_id).all()
    if not goals:
        return 0.0, "No shared goals set yet."
    has_contrib = (
        db.query(SharedGoalContribution)
        .filter(
            SharedGoalContribution.account_id == account_id,
            extract("month", SharedGoalContribution.date) == month,
            extract("year", SharedGoalContribution.date) == year,
        )
        .first()
        is not None
    )
    if has_contrib:
        return float(MAX_PER_COMPONENT), "You contributed to your shared goals this month."
    return 10.0, "You have goals but haven't contributed this month."


def _settle_up(db, account_id, month, year):
    bal = _split_balance_abs(db, account_id, month, year)
    if bal < 10:
        return float(MAX_PER_COMPONENT), "You're all settled up."
    if bal < 50:
        return 10.0, f"A small balance of ${bal:.2f} is outstanding."
    return 0.0, f"A balance of ${bal:.2f} is outstanding between you."


def _grade(score: int) -> str:
    if score >= 90:
        return "A"
    if score >= 80:
        return "B"
    if score >= 70:
        return "C"
    if score >= 60:
        return "D"
    return "F"


# One-line, action-oriented tips per component for the lowest scorer.
def _tip_for(comp: HealthComponent) -> str:
    key = comp.key
    if key == "savings_rate":
        return "Tip: Aim to save at least 20% of your income — automating a transfer to savings helps."
    if key == "budget_adherence":
        return "Tip: Some categories are over budget. Trim spending or adjust your limits to get back on track."
    if key == "spending_trend":
        return "Tip: Your spending is trending up. Pick one or two categories to cut back this month."
    if key == "goal_progress":
        if comp.score == 0:
            return "Tip: You have no active shared goals. Set a goal together to boost your score!"
        return "Tip: Add a contribution to your shared goals this month to keep your momentum going."
    if key == "settle_up":
        return "Tip: Settle up with your partner to balance out shared expenses."
    return "Tip: Keep up the good work!"


def _compute(db: Session, account: Account, month: int, year: int) -> HealthScoreOut:
    raw = [
        ("savings_rate", "Savings Rate", _savings_rate(db, account.id, month, year)),
        ("budget_adherence", "Budget Adherence", _budget_adherence(db, account.id, month, year)),
        ("spending_trend", "Spending Trend", _spending_trend(db, account.id, month, year)),
        ("goal_progress", "Goal Progress", _goal_progress(db, account.id, month, year)),
        ("settle_up", "Settle Up", _settle_up(db, account.id, month, year)),
    ]
    components = [
        HealthComponent(key=key, name=name, score=score, max=MAX_PER_COMPONENT, description=desc)
        for key, name, (score, desc) in raw
    ]
    total = round(sum(c.score for c in components))
    # Lowest-scoring component drives the headline tip (first wins on a tie).
    lowest = min(components, key=lambda c: c.score)
    return HealthScoreOut(
        month=month,
        year=year,
        score=total,
        grade=_grade(total),
        tip=_tip_for(lowest),
        components=components,
    )


@router.get("", response_model=HealthScoreOut)
def get_health_score(
    month: int | None = Query(None, ge=1, le=12),
    year: int | None = Query(None, ge=2000, le=2100),
    db: Session = Depends(get_db),
    account: Account = Depends(get_current_account),
):
    """Current (or historical, via ?month=&year=) financial health score."""
    today = date.today()
    m = month or today.month
    y = year or today.year
    return _compute(db, account, m, y)


@router.get("/history", response_model=HealthScoreHistoryOut)
def get_health_score_history(
    months: int = Query(6, ge=1, le=24),
    db: Session = Depends(get_db),
    account: Account = Depends(get_current_account),
):
    """Health score for each of the last `months` months, oldest first — powers
    the Trends chart."""
    today = date.today()
    periods = []
    for i in range(months - 1, -1, -1):
        m = today.month - i
        y = today.year
        while m <= 0:
            m += 12
            y -= 1
        periods.append((m, y))

    points = []
    for m, y in periods:
        result = _compute(db, account, m, y)
        points.append(
            HealthScorePoint(
                month=m,
                year=y,
                label=f"{calendar.month_abbr[m]} {y}",
                score=result.score,
                grade=result.grade,
            )
        )
    return HealthScoreHistoryOut(points=points)
