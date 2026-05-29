from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth import get_current_account
from app.models import (
    SavingsGoal,
    SavingsAllocation,
    SavingsTransaction,
    Transaction,
    Category,
    User,
)
from app.models.account import Account
from app.schemas.savings import (
    SavingsGoalCreate,
    SavingsGoalOut,
    SavingsAllocationCreate,
    SavingsAllocationOut,
    SavingsTransactionCreate,
    SavingsTransactionOut,
)

router = APIRouter(prefix="/api/savings", tags=["savings"])

SAVINGS_CATEGORY_NAME = "Savings"


def _signed(txn: SavingsTransaction) -> float:
    """Deposits add to a balance, withdrawals subtract."""
    return txn.amount if txn.type == "deposit" else -txn.amount


def _enrich_goal(goal: SavingsGoal) -> SavingsGoalOut:
    # Sum signed savings transactions per allocation and overall.
    per_allocation: dict[int, float] = defaultdict(float)
    total_saved = 0.0
    for txn in goal.transactions:
        total_saved += _signed(txn)
        if txn.allocation_id is not None:
            per_allocation[txn.allocation_id] += _signed(txn)

    allocations = [
        SavingsAllocationOut(
            id=a.id,
            label=a.label,
            target_amount=a.target_amount,
            saved=round(per_allocation.get(a.id, 0.0), 2),
        )
        for a in goal.allocations
    ]
    total_target = sum(a.target_amount for a in goal.allocations)

    return SavingsGoalOut(
        id=goal.id,
        name=goal.name,
        color=goal.color,
        created_at=goal.created_at,
        total_target=round(total_target, 2),
        total_saved=round(total_saved, 2),
        allocations=allocations,
    )


def _get_goal_or_404(goal_id: int, db: Session, account: Account) -> SavingsGoal:
    goal = db.query(SavingsGoal).filter(
        SavingsGoal.id == goal_id, SavingsGoal.account_id == account.id
    ).first()
    if not goal:
        raise HTTPException(404, "Savings goal not found")
    return goal


def _get_or_create_savings_category(db: Session, account: Account) -> Category:
    cat = db.query(Category).filter(
        Category.account_id == account.id, Category.name == SAVINGS_CATEGORY_NAME
    ).first()
    if not cat:
        cat = Category(
            account_id=account.id,
            name=SAVINGS_CATEGORY_NAME,
            color="#22C55E",
            icon="piggy-bank",
        )
        db.add(cat)
        db.flush()
    return cat


@router.get("", response_model=list[SavingsGoalOut])
def list_savings(
    db: Session = Depends(get_db),
    account: Account = Depends(get_current_account),
):
    goals = db.query(SavingsGoal).filter(
        SavingsGoal.account_id == account.id
    ).order_by(SavingsGoal.created_at.desc()).all()
    return [_enrich_goal(g) for g in goals]


@router.post("", response_model=SavingsGoalOut, status_code=201)
def create_savings_goal(
    data: SavingsGoalCreate,
    db: Session = Depends(get_db),
    account: Account = Depends(get_current_account),
):
    goal = SavingsGoal(name=data.name, color=data.color, account_id=account.id)
    db.add(goal)
    db.commit()
    db.refresh(goal)
    return _enrich_goal(goal)


@router.delete("/{goal_id}", status_code=204)
def delete_savings_goal(
    goal_id: int,
    db: Session = Depends(get_db),
    account: Account = Depends(get_current_account),
):
    goal = _get_goal_or_404(goal_id, db, account)
    # allocations + savings transactions cascade via relationship config.
    db.delete(goal)
    db.commit()


@router.post("/{goal_id}/allocations", response_model=SavingsAllocationOut, status_code=201)
def add_allocation(
    goal_id: int,
    data: SavingsAllocationCreate,
    db: Session = Depends(get_db),
    account: Account = Depends(get_current_account),
):
    goal = _get_goal_or_404(goal_id, db, account)
    alloc = SavingsAllocation(
        goal_id=goal.id,
        account_id=account.id,
        label=data.label,
        target_amount=data.target_amount,
    )
    db.add(alloc)
    db.commit()
    db.refresh(alloc)
    return SavingsAllocationOut(
        id=alloc.id, label=alloc.label, target_amount=alloc.target_amount, saved=0.0
    )


@router.delete("/{goal_id}/allocations/{alloc_id}", status_code=204)
def delete_allocation(
    goal_id: int,
    alloc_id: int,
    db: Session = Depends(get_db),
    account: Account = Depends(get_current_account),
):
    _get_goal_or_404(goal_id, db, account)
    alloc = db.query(SavingsAllocation).filter(
        SavingsAllocation.id == alloc_id,
        SavingsAllocation.goal_id == goal_id,
        SavingsAllocation.account_id == account.id,
    ).first()
    if not alloc:
        raise HTTPException(404, "Allocation not found")
    # Detach any savings transactions from this allocation rather than deleting
    # them — the deposits/withdrawals still count toward the goal's overall total.
    db.query(SavingsTransaction).filter(
        SavingsTransaction.allocation_id == alloc_id
    ).update({SavingsTransaction.allocation_id: None})
    db.delete(alloc)
    db.commit()


@router.post("/{goal_id}/transactions", response_model=SavingsTransactionOut, status_code=201)
def add_savings_transaction(
    goal_id: int,
    data: SavingsTransactionCreate,
    db: Session = Depends(get_db),
    account: Account = Depends(get_current_account),
):
    goal = _get_goal_or_404(goal_id, db, account)

    alloc = None
    if data.allocation_id is not None:
        alloc = db.query(SavingsAllocation).filter(
            SavingsAllocation.id == data.allocation_id,
            SavingsAllocation.goal_id == goal.id,
            SavingsAllocation.account_id == account.id,
        ).first()
        if not alloc:
            raise HTTPException(404, "Allocation not found")

    # A deposit also lands in the main transactions table (category: Savings)
    # so it shows up in spending and cumulative balance. Withdrawals stay
    # entirely within savings and never touch the main ledger.
    if data.type == "deposit":
        if not data.paid_by:
            raise HTTPException(422, "paid_by is required for deposits")
        if not db.query(User).filter(
            User.id == data.paid_by, User.account_id == account.id
        ).first():
            raise HTTPException(404, "User not found")
        category = _get_or_create_savings_category(db, account)
        db.add(Transaction(
            amount=data.amount,
            category_id=category.id,
            paid_by=data.paid_by,
            date=data.date,
            note=data.note or f"Savings deposit - {goal.name}",
            account_id=account.id,
        ))

    txn = SavingsTransaction(
        goal_id=goal.id,
        allocation_id=data.allocation_id,
        account_id=account.id,
        amount=data.amount,
        type=data.type,
        note=data.note,
        date=data.date,
    )
    db.add(txn)
    db.commit()
    db.refresh(txn)
    return SavingsTransactionOut(
        id=txn.id,
        goal_id=txn.goal_id,
        allocation_id=txn.allocation_id,
        allocation_label=alloc.label if alloc else None,
        amount=txn.amount,
        type=txn.type,
        note=txn.note,
        date=txn.date,
    )


@router.get("/{goal_id}/transactions", response_model=list[SavingsTransactionOut])
def list_savings_transactions(
    goal_id: int,
    db: Session = Depends(get_db),
    account: Account = Depends(get_current_account),
):
    goal = _get_goal_or_404(goal_id, db, account)
    label_map = {a.id: a.label for a in goal.allocations}
    txns = db.query(SavingsTransaction).filter(
        SavingsTransaction.goal_id == goal.id
    ).order_by(SavingsTransaction.date.desc(), SavingsTransaction.id.desc()).all()
    return [
        SavingsTransactionOut(
            id=t.id,
            goal_id=t.goal_id,
            allocation_id=t.allocation_id,
            allocation_label=label_map.get(t.allocation_id),
            amount=t.amount,
            type=t.type,
            note=t.note,
            date=t.date,
        )
        for t in txns
    ]
