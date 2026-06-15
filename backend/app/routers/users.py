from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth import get_current_account
from app.models import (
    User,
    Transaction,
    RecurringTransaction,
    BudgetLineItem,
    Budget,
    SavingsTransaction,
    SavingsAllocation,
    SavingsGoal,
    Income,
    SharedGoalContribution,
    SharedGoal,
    Settlement,
)
from app.models.account import Account

router = APIRouter(prefix="/api/users", tags=["users"])


class UserOut(BaseModel):
    id: int
    name: str
    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    name: str


class ResetDataResponse(BaseModel):
    success: bool
    message: str


@router.get("", response_model=list[UserOut])
def list_users(
    db: Session = Depends(get_db),
    account: Account = Depends(get_current_account),
):
    return db.query(User).filter(User.account_id == account.id).order_by(User.id).all()


@router.put("/{user_id}", response_model=UserOut)
def update_user(
    user_id: int,
    data: UserUpdate,
    db: Session = Depends(get_db),
    account: Account = Depends(get_current_account),
):
    user = db.query(User).filter(User.id == user_id, User.account_id == account.id).first()
    if not user:
        raise HTTPException(404, "User not found")
    user.name = data.name
    db.commit()
    db.refresh(user)
    return user


@router.delete("/reset-data", response_model=ResetDataResponse)
def reset_data(
    db: Session = Depends(get_db),
    account: Account = Depends(get_current_account),
):
    """Wipe all of this account's financial data for a clean slate.

    Deletes every transaction, budget, savings goal, recurring rule, income
    entry, shared goal, and settlement owned by the effective (possibly shared)
    account. Deliberately KEEPS the account, its users, categories, partner
    links, and profile settings — the user stays signed in with their setup
    intact, just with no data.

    Every row is removed child-first so foreign keys hold on Postgres (SQLite
    doesn't enforce them by default, but the order is correct for both). All
    deletes share one transaction and a single commit at the end, so the wipe is
    all-or-nothing: if anything fails it rolls back and nothing is lost.
    """
    aid = account.id

    # Child-first so FK constraints are never violated. Recurring transaction
    # instances are ordinary rows in `transactions` (carrying a recurring_id),
    # so clearing Transaction removes them along with manual entries.
    deletion_order = [
        Transaction,            # -> categories, users, recurring_transactions
        RecurringTransaction,   # recurring templates -> categories, users
        BudgetLineItem,         # -> budgets
        Budget,                 # -> categories
        SavingsTransaction,     # -> savings_goals, savings_allocations
        SavingsAllocation,      # -> savings_goals
        SavingsGoal,
        Income,                 # -> users
        SharedGoalContribution, # -> shared_goals
        SharedGoal,
        Settlement,
    ]
    try:
        for model in deletion_order:
            db.query(model).filter(model.account_id == aid).delete(
                synchronize_session=False
            )
        db.commit()
    except Exception:
        db.rollback()
        raise

    return ResetDataResponse(success=True, message="All data has been reset.")
