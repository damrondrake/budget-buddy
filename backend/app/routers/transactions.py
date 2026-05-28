from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth import get_current_account
from app.models import Transaction, Category, User
from app.models.account import Account
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
    account: Account = Depends(get_current_account),
):
    q = db.query(Transaction).filter(Transaction.account_id == account.id)
    if month is not None and year is not None:
        from sqlalchemy import extract
        q = q.filter(extract("month", Transaction.date) == month, extract("year", Transaction.date) == year)
    if category_id is not None:
        q = q.filter(Transaction.category_id == category_id)
    return [_enrich(t) for t in q.order_by(Transaction.date.desc()).all()]


@router.post("", response_model=TransactionOut, status_code=201)
def create_transaction(
    data: TransactionCreate,
    db: Session = Depends(get_db),
    account: Account = Depends(get_current_account),
):
    if not db.query(Category).filter(Category.id == data.category_id, Category.account_id == account.id).first():
        raise HTTPException(404, "Category not found")
    if not db.query(User).filter(User.id == data.paid_by, User.account_id == account.id).first():
        raise HTTPException(404, "User not found")
    t = Transaction(**data.model_dump(), account_id=account.id)
    db.add(t)
    db.commit()
    db.refresh(t)
    return _enrich(t)


@router.put("/{transaction_id}", response_model=TransactionOut)
def update_transaction(
    transaction_id: int,
    data: TransactionUpdate,
    db: Session = Depends(get_db),
    account: Account = Depends(get_current_account),
):
    t = db.query(Transaction).filter(Transaction.id == transaction_id, Transaction.account_id == account.id).first()
    if not t:
        raise HTTPException(404, "Transaction not found")
    updates = data.model_dump(exclude_unset=True)
    if "category_id" in updates:
        if not db.query(Category).filter(Category.id == updates["category_id"], Category.account_id == account.id).first():
            raise HTTPException(404, "Category not found")
    if "paid_by" in updates:
        if not db.query(User).filter(User.id == updates["paid_by"], User.account_id == account.id).first():
            raise HTTPException(404, "User not found")
    for k, v in updates.items():
        setattr(t, k, v)
    db.commit()
    db.refresh(t)
    return _enrich(t)


@router.delete("/{transaction_id}", status_code=204)
def delete_transaction(
    transaction_id: int,
    db: Session = Depends(get_db),
    account: Account = Depends(get_current_account),
):
    t = db.query(Transaction).filter(Transaction.id == transaction_id, Transaction.account_id == account.id).first()
    if not t:
        raise HTTPException(404, "Transaction not found")
    db.delete(t)
    db.commit()
