from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Budget, Category
from app.schemas.budget import BudgetCreate, BudgetOut

router = APIRouter(prefix="/api/budgets", tags=["budgets"])


def _enrich(b: Budget) -> BudgetOut:
    return BudgetOut(
        id=b.id,
        category_id=b.category_id,
        month=b.month,
        year=b.year,
        amount_limit=b.amount_limit,
        category_name=b.category.name if b.category else None,
    )


@router.get("", response_model=list[BudgetOut])
def list_budgets(
    month: int = Query(...),
    year: int = Query(...),
    db: Session = Depends(get_db),
):
    budgets = db.query(Budget).filter(Budget.month == month, Budget.year == year).all()
    return [_enrich(b) for b in budgets]


@router.post("", response_model=BudgetOut, status_code=201)
def upsert_budget(data: BudgetCreate, db: Session = Depends(get_db)):
    if not db.get(Category, data.category_id):
        raise HTTPException(404, "Category not found")
    existing = db.query(Budget).filter(
        Budget.category_id == data.category_id,
        Budget.month == data.month,
        Budget.year == data.year,
    ).first()
    if existing:
        existing.amount_limit = data.amount_limit
        db.commit()
        db.refresh(existing)
        return _enrich(existing)
    b = Budget(**data.model_dump())
    db.add(b)
    db.commit()
    db.refresh(b)
    return _enrich(b)
