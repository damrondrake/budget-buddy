from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Transaction, Category, User
from app.schemas.transaction import TransactionCreate, TransactionUpdate, TransactionOut

router = APIRouter(prefix="/api/transactions", tags=["transactions"])


def _enrich(t: Transaction) -> TransactionOut:
    return TransactionOut(
        id=t.id,
        amount=t.amount,
        category_id=t.category_id,
        paid_by=t.paid_by,
        is_split=t.is_split,
        date=t.date,
        note=t.note,
        is_recurring=t.is_recurring,
        recurring_id=t.recurring_id,
        category_name=t.category.name if t.category else None,
        paid_by_name=t.paid_by_user.name if t.paid_by_user else None,
    )


@router.get("", response_model=list[TransactionOut])
def list_transactions(
    month: int | None = Query(None),
    year: int | None = Query(None),
    category_id: int | None = Query(None),
    db: Session = Depends(get_db),
):
    q = db.query(Transaction)
    if month is not None and year is not None:
        from sqlalchemy import extract
        q = q.filter(extract("month", Transaction.date) == month, extract("year", Transaction.date) == year)
    if category_id is not None:
        q = q.filter(Transaction.category_id == category_id)
    return [_enrich(t) for t in q.order_by(Transaction.date.desc()).all()]


@router.post("", response_model=TransactionOut, status_code=201)
def create_transaction(data: TransactionCreate, db: Session = Depends(get_db)):
    if not db.get(Category, data.category_id):
        raise HTTPException(404, "Category not found")
    if not db.get(User, data.paid_by):
        raise HTTPException(404, "User not found")
    t = Transaction(**data.model_dump())
    db.add(t)
    db.commit()
    db.refresh(t)
    return _enrich(t)


@router.put("/{transaction_id}", response_model=TransactionOut)
def update_transaction(transaction_id: int, data: TransactionUpdate, db: Session = Depends(get_db)):
    t = db.get(Transaction, transaction_id)
    if not t:
        raise HTTPException(404, "Transaction not found")
    updates = data.model_dump(exclude_unset=True)
    if "category_id" in updates and not db.get(Category, updates["category_id"]):
        raise HTTPException(404, "Category not found")
    if "paid_by" in updates and not db.get(User, updates["paid_by"]):
        raise HTTPException(404, "User not found")
    for k, v in updates.items():
        setattr(t, k, v)
    db.commit()
    db.refresh(t)
    return _enrich(t)


@router.delete("/{transaction_id}", status_code=204)
def delete_transaction(transaction_id: int, db: Session = Depends(get_db)):
    t = db.get(Transaction, transaction_id)
    if not t:
        raise HTTPException(404, "Transaction not found")
    db.delete(t)
    db.commit()
