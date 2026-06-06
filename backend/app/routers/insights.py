"""Plain-English AI spending insights, powered by the Anthropic API.

Gathers a snapshot of the account's finances for a month, sends it to Claude
(acting as "BudgetBuddy AI"), and returns 4-6 friendly, data-driven insights.
Results are cached per account/month for 24 hours so we don't call the API on
every Dashboard load. When ANTHROPIC_API_KEY isn't set, the endpoint returns a
placeholder so the frontend can show "AI Insights coming soon!".
"""
import json
import logging
import os
import re
from collections import defaultdict
from datetime import date, datetime, timedelta, timezone

import anthropic
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import extract
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth import get_current_account
from app.models import (
    Budget,
    Category,
    Income,
    InsightsCache,
    SharedGoal,
    Transaction,
)
from app.models.account import Account
from app.routers.health import _compute as compute_health_score
from app.routers.health import _split_balance_abs
from app.schemas.insights import Insight, InsightsOut

router = APIRouter(prefix="/api/insights", tags=["insights"])

_log = logging.getLogger("uvicorn.error")

INSIGHTS_MODEL = "claude-sonnet-4-6"
CACHE_TTL = timedelta(hours=24)
VALID_TYPES = {"positive", "warning", "tip", "neutral"}

# Structured-output schema: the model is constrained to return exactly this
# shape, so the response is guaranteed valid JSON (no fences, no stray prose).
INSIGHTS_SCHEMA = {
    "type": "object",
    "properties": {
        "insights": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "body": {"type": "string"},
                    "type": {"type": "string", "enum": sorted(VALID_TYPES)},
                    "icon": {"type": "string"},
                },
                "required": ["title", "body", "type", "icon"],
                "additionalProperties": False,
            },
        },
    },
    "required": ["insights"],
    "additionalProperties": False,
}

SYSTEM_PROMPT = (
    "You are BudgetBuddy AI, a friendly, encouraging personal finance advisor inside a "
    "couple's budgeting app. You are given a JSON snapshot of the user's finances for one "
    "month. Generate 4 to 6 specific, actionable, data-driven insights in plain, warm English.\n\n"
    "Rules:\n"
    "- Reference real numbers from the data (category names, amounts, percentages). Be concrete, "
    "not generic.\n"
    "- Each insight has these fields:\n"
    "  - \"title\": a short headline (<= 6 words)\n"
    "  - \"body\": 1-2 sentences of plain-English advice or observation\n"
    "  - \"type\": one of \"positive\" (good news), \"warning\" (a problem to address), "
    "\"tip\" (actionable advice), or \"neutral\" (a neutral observation)\n"
    "  - \"icon\": a single relevant emoji\n"
    "- Aim for a mix of types; lead with encouragement where the data supports it.\n"
    "- Return a JSON object with an \"insights\" array of these objects."
)


def get_api_key() -> str | None:
    return os.getenv("ANTHROPIC_API_KEY")


def insights_configured() -> bool:
    return bool(get_api_key())


# --- Data gathering ---------------------------------------------------------

def _txns_for(db: Session, account_id: int, month: int, year: int):
    return (
        db.query(Transaction)
        .filter(
            Transaction.account_id == account_id,
            extract("month", Transaction.date) == month,
            extract("year", Transaction.date) == year,
        )
        .all()
    )


def _build_context(db: Session, account: Account, month: int, year: int) -> dict:
    """A compact JSON-able snapshot of the month's finances for the model."""
    cats = {c.id: c for c in db.query(Category).filter(Category.account_id == account.id).all()}

    incomes = db.query(Income).filter(
        Income.account_id == account.id, Income.month == month, Income.year == year
    ).all()
    total_income = sum(i.amount for i in incomes)

    txns = _txns_for(db, account.id, month, year)
    total_spent = sum(t.amount for t in txns)

    cat_spending: dict[int, float] = defaultdict(float)
    for t in txns:
        cat_spending[t.category_id] += t.amount

    budgets = db.query(Budget).filter(
        Budget.account_id == account.id, Budget.month == month, Budget.year == year
    ).all()

    def budget_total(b):
        return sum(li.amount for li in b.line_items) if b.line_items else b.amount_limit

    budget_by_cat = {b.category_id: b for b in budgets}
    seen = set()
    by_category = []
    for cid, spent in cat_spending.items():
        b = budget_by_cat.get(cid)
        by_category.append({
            "category": cats[cid].name if cid in cats else "Unknown",
            "spent": round(spent, 2),
            "budget": round(budget_total(b), 2) if b else None,
            "paid": bool(b.paid) if b else None,
        })
        seen.add(cid)
    for cid, b in budget_by_cat.items():
        if cid not in seen:
            by_category.append({
                "category": cats[cid].name if cid in cats else "Unknown",
                "spent": 0.0,
                "budget": round(budget_total(b), 2),
                "paid": bool(b.paid),
            })

    # Last 3 months total + per-category spending (the trend).
    recent_months = []
    m, y = month, year
    for _ in range(3):
        m -= 1
        if m <= 0:
            m += 12
            y -= 1
        mt = _txns_for(db, account.id, m, y)
        per: dict[str, float] = defaultdict(float)
        for t in mt:
            name = cats[t.category_id].name if t.category_id in cats else "Unknown"
            per[name] += t.amount
        recent_months.append({
            "month": m,
            "year": y,
            "total_spent": round(sum(per.values()), 2),
            "by_category": {k: round(v, 2) for k, v in per.items()},
        })

    goals = db.query(SharedGoal).filter(SharedGoal.account_id == account.id).all()
    shared_goals = []
    for g in goals:
        contributed = sum(c.amount for c in g.contributions)
        shared_goals.append({
            "name": g.name,
            "target": round(g.target_amount, 2),
            "contributed": round(contributed, 2),
            "percent_complete": round(min(contributed / g.target_amount * 100, 100), 1)
            if g.target_amount > 0 else 0,
        })

    health = compute_health_score(db, account, month, year)
    balance = _split_balance_abs(db, account.id, month, year)

    return {
        "month": month,
        "year": year,
        "total_income": round(total_income, 2),
        "total_spent": round(total_spent, 2),
        "remaining": round(total_income - total_spent, 2),
        "spending_by_category": by_category,
        "recent_months_trend": recent_months,
        "shared_goals": shared_goals,
        "health_score": {
            "score": health.score,
            "grade": health.grade,
            "components": [
                {"name": c.name, "score": c.score, "max": c.max, "description": c.description}
                for c in health.components
            ],
        },
        "settlement_balance_outstanding": round(balance, 2),
    }


# --- Anthropic call + parsing -----------------------------------------------

def _parse_insights(text: str) -> list[Insight]:
    """Parse the model's response into validated Insight objects."""
    cleaned = text.strip()
    # Strip ```json ... ``` fences if the model added them despite instructions.
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```[a-zA-Z]*\n?", "", cleaned)
        cleaned = re.sub(r"\n?```$", "", cleaned).strip()

    try:
        data = json.loads(cleaned)
    except json.JSONDecodeError:
        # Last resort: pull out the first usable {...} wrapper or [...] block.
        candidates = [
            cleaned[s:e + 1]
            for s, e in ((cleaned.find("["), cleaned.rfind("]")), (cleaned.find("{"), cleaned.rfind("}")))
            if s != -1 and e > s
        ]
        for candidate in candidates:
            try:
                parsed = json.loads(candidate)
            except json.JSONDecodeError:
                continue
            # Accept a bare array, or an object that carries the insights list.
            if isinstance(parsed, list) or (isinstance(parsed, dict) and "insights" in parsed):
                data = parsed
                break
        else:
            raise ValueError("No JSON insights found in response")

    # Structured output returns {"insights": [...]}; also accept a bare array.
    if isinstance(data, dict):
        data = data.get("insights", [])
    if not isinstance(data, list):
        raise ValueError("Expected a JSON array of insights")

    out = []
    for item in data:
        if not isinstance(item, dict):
            continue
        title = str(item.get("title", "")).strip()
        body = str(item.get("body", "")).strip()
        itype = str(item.get("type", "neutral")).strip().lower()
        if itype not in VALID_TYPES:
            itype = "neutral"
        icon = str(item.get("icon", "💡")).strip() or "💡"
        if title and body:
            out.append(Insight(title=title, body=body, type=itype, icon=icon))
    return out[:6]


def _generate(context: dict) -> list[Insight]:
    client = anthropic.Anthropic(api_key=get_api_key())
    message = client.messages.create(
        model=INSIGHTS_MODEL,
        max_tokens=1500,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": json.dumps(context)}],
        # Constrain output to the schema — guarantees valid, parseable JSON.
        output_config={"format": {"type": "json_schema", "schema": INSIGHTS_SCHEMA}},
    )
    text = "".join(b.text for b in message.content if b.type == "text")
    return _parse_insights(text)


# --- Endpoint ---------------------------------------------------------------

@router.get("", response_model=InsightsOut)
def get_insights(
    month: int | None = Query(None, ge=1, le=12),
    year: int | None = Query(None, ge=2000, le=2100),
    refresh: bool = Query(False, description="Bypass the 24h cache and regenerate."),
    db: Session = Depends(get_db),
    account: Account = Depends(get_current_account),
):
    """AI spending insights for the month (cached 24h; `refresh=true` regenerates)."""
    today = date.today()
    m = month or today.month
    y = year or today.year

    if not refresh:
        cached = (
            db.query(InsightsCache)
            .filter(
                InsightsCache.account_id == account.id,
                InsightsCache.month == m,
                InsightsCache.year == y,
            )
            .first()
        )
        if cached:
            gen = cached.generated_at
            if gen.tzinfo is None:
                gen = gen.replace(tzinfo=timezone.utc)
            if datetime.now(timezone.utc) - gen < CACHE_TTL:
                return InsightsOut(
                    month=m,
                    year=y,
                    configured=True,
                    cached=True,
                    generated_at=cached.generated_at,
                    insights=[Insight(**i) for i in cached.insights],
                )

    if not insights_configured():
        return InsightsOut(month=m, year=y, configured=False, cached=False, insights=[])

    context = _build_context(db, account, m, y)
    try:
        insights = _generate(context)
    except Exception as exc:  # network/SDK/parse errors — don't 500 the dashboard
        _log.error("AI insights generation failed: %s", exc)
        raise HTTPException(503, "Could not generate insights right now. Please try again.")

    payload = [i.model_dump() for i in insights]
    now = datetime.now(timezone.utc)
    row = (
        db.query(InsightsCache)
        .filter(
            InsightsCache.account_id == account.id,
            InsightsCache.month == m,
            InsightsCache.year == y,
        )
        .first()
    )
    if row:
        row.insights = payload
        row.generated_at = now
    else:
        db.add(InsightsCache(account_id=account.id, month=m, year=y, insights=payload, generated_at=now))
    db.commit()

    return InsightsOut(month=m, year=y, configured=True, cached=False, generated_at=now, insights=insights)
