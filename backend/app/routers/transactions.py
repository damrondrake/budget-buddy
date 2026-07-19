from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth import get_current_account
from app.models import Transaction, Category, User, RecurringTransaction
from app.models.account import Account
from app.schemas.transaction import TransactionCreate, TransactionUpdate, TransactionOut

router = APIRouter(prefix="/api/transactions", tags=["transactions"])


def _attach_recurring_rule(db: Session, t: Transaction, frequency: str, account_id: int) -> None:
    """Create a recurring rule mirroring this transaction and link them.

    The transaction's day drives day_of_month, and its month is the yearly
    anchor. The rule reuses the same category, amount, paid_by, is_split, note.
    """
    rule = RecurringTransaction(
        amount=t.amount,
        category_id=t.category_id,
        paid_by=t.paid_by,
        is_split=t.is_split,
        day_of_month=t.date.day,
        note=t.note or "",
        frequency=frequency,
        month_of_year=t.date.month,
        account_id=account_id,
    )
    db.add(rule)
    db.flush()
    t.recurring_id = rule.id
    t.is_recurring = True


def _detach_recurring_rule(db: Session, rule_id: int, account_id: int) -> None:
    """Delete a recurring rule but keep its transactions (just unlink them)."""
    db.query(Transaction).filter(
        Transaction.recurring_id == rule_id, Transaction.account_id == account_id
    ).update(
        {Transaction.recurring_id: None, Transaction.is_recurring: False},
        synchronize_session=False,
    )
    rule = db.query(RecurringTransaction).filter(
        RecurringTransaction.id == rule_id, RecurringTransaction.account_id == account_id
    ).first()
    if rule:
        db.delete(rule)


def _enrich(t: Transaction) -> TransactionOut:
    return TransactionOut(
        id=t.id,
        amount=t.amount,
        category_id=t.category_id,
        paid_by=t.paid_by,
        is_split=t.is_split,
        date=t.date,
        note=t.note,
        excluded_from_balance=t.excluded_from_balance,
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
    payload = data.model_dump(exclude={"make_recurring", "recurring_frequency"})
    t = Transaction(**payload, account_id=account.id)
    db.add(t)
    db.flush()
    if data.make_recurring:
        _attach_recurring_rule(db, t, data.recurring_frequency or "monthly", account.id)
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
    updates = data.model_dump(exclude_unset=True, exclude={"make_recurring", "recurring_frequency"})
    if "category_id" in updates:
        if not db.query(Category).filter(Category.id == updates["category_id"], Category.account_id == account.id).first():
            raise HTTPException(404, "Category not found")
    if "paid_by" in updates:
        if not db.query(User).filter(User.id == updates["paid_by"], User.account_id == account.id).first():
            raise HTTPException(404, "User not found")
    for k, v in updates.items():
        setattr(t, k, v)

    # Recurring toggle: create a rule when turned on (and not already recurring),
    # or remove the rule when turned off (keeping this and any sibling txns).
    if data.make_recurring is not None:
        if data.make_recurring and not t.recurring_id:
            _attach_recurring_rule(db, t, data.recurring_frequency or "monthly", account.id)
        elif not data.make_recurring and t.recurring_id:
            _detach_recurring_rule(db, t.recurring_id, account.id)

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
