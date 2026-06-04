from datetime import date as date_type

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth import get_current_account
from app.models import Income, User
from app.models.account import Account
from app.schemas.account import StartingBalanceRequest, StartingBalanceOut

router = APIRouter(prefix="/api/account", tags=["account"])

# A starting balance is just a special income row: one per account, locked, and
# managed only here. Because it's an income entry, it flows into /api/summary
# (monthly remaining) and /api/cumulative automatically — no special-casing.
STARTING_BALANCE_TYPE = "starting_balance"
STARTING_BALANCE_SOURCE = "Starting Balance"


def _to_out(entry: Income) -> StartingBalanceOut:
    # Income is month/year granular, so we surface a date on the first of the
    # stored month for the Settings form to prefill.
    return StartingBalanceOut(
        id=entry.id,
        amount=entry.amount,
        date=date_type(entry.year, entry.month, 1),
        month=entry.month,
        year=entry.year,
    )


def _get_starting_balance(db: Session, account_id: int) -> Income | None:
    return (
        db.query(Income)
        .filter(Income.account_id == account_id, Income.type == STARTING_BALANCE_TYPE)
        .first()
    )


@router.get("/starting-balance", response_model=StartingBalanceOut | None)
def get_starting_balance(
    db: Session = Depends(get_db),
    account: Account = Depends(get_current_account),
):
    """Return the account's starting balance entry, or null if none is set."""
    entry = _get_starting_balance(db, account.id)
    return _to_out(entry) if entry else None


@router.post("/starting-balance", response_model=StartingBalanceOut)
def set_starting_balance(
    data: StartingBalanceRequest,
    db: Session = Depends(get_db),
    account: Account = Depends(get_current_account),
):
    """Create or replace the account's single starting balance entry."""
    existing = _get_starting_balance(db, account.id)
    if existing:
        existing.amount = data.amount
        existing.month = data.date.month
        existing.year = data.date.year
        db.commit()
        db.refresh(existing)
        return _to_out(existing)

    # Income requires a user_id (FK). The starting balance is account-level, so
    # we attach it to the account's first person slot — it isn't used in any
    # per-person split math (only transactions are).
    user = (
        db.query(User)
        .filter(User.account_id == account.id)
        .order_by(User.id)
        .first()
    )
    if not user:
        raise HTTPException(400, "No user available to attach the starting balance to.")

    entry = Income(
        user_id=user.id,
        amount=data.amount,
        source=STARTING_BALANCE_SOURCE,
        month=data.date.month,
        year=data.date.year,
        account_id=account.id,
        type=STARTING_BALANCE_TYPE,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return _to_out(entry)


@router.delete("/starting-balance", status_code=204)
def delete_starting_balance(
    db: Session = Depends(get_db),
    account: Account = Depends(get_current_account),
):
    """Remove the account's starting balance entry (Settings-only action)."""
    entry = _get_starting_balance(db, account.id)
    if not entry:
        raise HTTPException(404, "No starting balance is set.")
    db.delete(entry)
    db.commit()
