from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth import get_current_account
from app.models import RecurringTransaction, Transaction, Category, User
from app.models.account import Account
from app.schemas.recurring import RecurringCreate, RecurringOut
from app.schemas.transaction import TransactionOut

router = APIRouter(prefix="/api/recurring", tags=["recurring"])


def _enrich(r: RecurringTransaction) -> RecurringOut:
    return RecurringOut(
        id=r.id,
        amount=r.amount,
        category_id=r.category_id,
        paid_by=r.paid_by,
        is_split=r.is_split,
        day_of_month=r.day_of_month,
        note=r.note,
        category_name=r.category.name if r.category else None,
        paid_by_name=r.paid_by_user.name if r.paid_by_user else None,
    )


@router.get("", response_model=list[RecurringOut])
def list_recurring(
    db: Session = Depends(get_db),
    account: Account = Depends(get_current_account),
):
    return [_enrich(r) for r in db.query(RecurringTransaction).filter(
        RecurringTransaction.account_id == account.id
    ).order_by(RecurringTransaction.id).all()]


@router.post("", response_model=RecurringOut, status_code=201)
def create_recurring(
    data: RecurringCreate,
    db: Session = Depends(get_db),
    account: Account = Depends(get_current_account),
):
    if not db.query(Category).filter(Category.id == data.category_id, Category.account_id == account.id).first():
        raise HTTPException(404, "Category not found")
    if not db.query(User).filter(User.id == data.paid_by, User.account_id == account.id).first():
        raise HTTPException(404, "User not found")
    if not 1 <= data.day_of_month <= 31:
        raise HTTPException(400, "day_of_month must be between 1 and 31")
    r = RecurringTransaction(**data.model_dump(), account_id=account.id)
    db.add(r)
    db.commit()
    db.refresh(r)
    return _enrich(r)


@router.delete("/{recurring_id}", status_code=204)
def delete_recurring(
    recurring_id: int,
    db: Session = Depends(get_db),
    account: Account = Depends(get_current_account),
):
    r = db.query(RecurringTransaction).filter(
        RecurringTransaction.id == recurring_id, RecurringTransaction.account_id == account.id
    ).first()
    if not r:
        raise HTTPException(404, "Recurring transaction not found")
    db.delete(r)
    db.commit()


@router.post("/apply", response_model=list[TransactionOut])
def apply_recurring(
    month: int = Query(...),
    year: int = Query(...),
    db: Session = Depends(get_db),
    account: Account = Depends(get_current_account),
):
    from sqlalchemy import extract
    import calendar

    recurring = db.query(RecurringTransaction).filter(
        RecurringTransaction.account_id == account.id
    ).all()
    created = []

    for r in recurring:
        already_exists = (
            db.query(Transaction)
            .filter(
                Transaction.recurring_id == r.id,
                Transaction.account_id == account.id,
                extract("month", Transaction.date) == month,
                extract("year", Transaction.date) == year,
            )
            .first()
        )
        if already_exists:
            continue

        last_day = calendar.monthrange(year, month)[1]
        day = min(r.day_of_month, last_day)

        t = Transaction(
            amount=r.amount,
            category_id=r.category_id,
            paid_by=r.paid_by,
            is_split=r.is_split,
            date=date(year, month, day),
            note=r.note,
            is_recurring=True,
            recurring_id=r.id,
            account_id=account.id,
        )
        db.add(t)
        created.append(t)

    db.commit()
    for t in created:
        db.refresh(t)

    return [_enrich_transaction(t) for t in created]


def _enrich_transaction(t: Transaction) -> TransactionOut:
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
