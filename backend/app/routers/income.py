from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Income, User
from app.schemas.income import IncomeCreate, IncomeOut

router = APIRouter(prefix="/api/income", tags=["income"])


def _enrich(i: Income) -> IncomeOut:
    return IncomeOut(
        id=i.id,
        user_id=i.user_id,
        amount=i.amount,
        source=i.source,
        month=i.month,
        year=i.year,
        user_name=i.user.name if i.user else None,
    )


@router.get("", response_model=list[IncomeOut])
def list_income(
    month: int = Query(...),
    year: int = Query(...),
    db: Session = Depends(get_db),
):
    rows = db.query(Income).filter(Income.month == month, Income.year == year).all()
    return [_enrich(i) for i in rows]


@router.post("", response_model=IncomeOut, status_code=201)
def create_income(data: IncomeCreate, db: Session = Depends(get_db)):
    if not db.get(User, data.user_id):
        raise HTTPException(404, "User not found")
    i = Income(**data.model_dump())
    db.add(i)
    db.commit()
    db.refresh(i)
    return _enrich(i)


@router.delete("/{income_id}", status_code=204)
def delete_income(income_id: int, db: Session = Depends(get_db)):
    i = db.get(Income, income_id)
    if not i:
        raise HTTPException(404, "Income entry not found")
    db.delete(i)
    db.commit()
