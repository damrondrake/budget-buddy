from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth import get_current_account
from app.models import SharedGoal, SharedGoalContribution, User
from app.models.account import Account
from app.schemas.shared_goal import (
    ContributionCreate,
    ContributionOut,
    SharedGoalCreate,
    SharedGoalOut,
    SharedGoalUpdate,
    UserContribution,
)

router = APIRouter(prefix="/api/shared-goals", tags=["shared-goals"])


def _name_map(db: Session, account_id: int) -> dict[int, str]:
    return {
        u.id: u.name
        for u in db.query(User)
        .filter(User.account_id == account_id)
        .order_by(User.id)
        .all()
    }


def _enrich(goal: SharedGoal, names: dict[int, str]) -> SharedGoalOut:
    per_user: dict[int, float] = defaultdict(float)
    total = 0.0
    for c in goal.contributions:
        per_user[c.user_id] += c.amount
        total += c.amount

    total = round(total, 2)
    target = goal.target_amount
    remaining = round(max(target - total, 0.0), 2)
    percent = round(min(total / target * 100, 100.0), 1) if target > 0 else 0.0
    is_complete = total >= target - 0.005  # tolerate float rounding

    # Always list every person on the account (even at $0) so the couples
    # breakdown shows both partners consistently.
    by_user = [
        UserContribution(
            user_id=uid,
            user_name=name,
            amount=round(per_user.get(uid, 0.0), 2),
        )
        for uid, name in names.items()
    ]

    return SharedGoalOut(
        id=goal.id,
        name=goal.name,
        description=goal.description,
        target_amount=round(target, 2),
        target_date=goal.target_date,
        color=goal.color,
        created_at=goal.created_at,
        total_contributed=total,
        remaining=remaining,
        percent_complete=percent,
        is_complete=is_complete,
        by_user=by_user,
    )


def _get_goal_or_404(goal_id: int, db: Session, account: Account) -> SharedGoal:
    goal = (
        db.query(SharedGoal)
        .filter(SharedGoal.id == goal_id, SharedGoal.account_id == account.id)
        .first()
    )
    if not goal:
        raise HTTPException(404, "Shared goal not found")
    return goal


@router.get("", response_model=list[SharedGoalOut])
def list_shared_goals(
    db: Session = Depends(get_db),
    account: Account = Depends(get_current_account),
):
    """List all shared goals with progress and per-user contribution breakdown."""
    goals = (
        db.query(SharedGoal)
        .filter(SharedGoal.account_id == account.id)
        .order_by(SharedGoal.created_at.desc())
        .all()
    )
    names = _name_map(db, account.id)
    return [_enrich(g, names) for g in goals]


@router.post("", response_model=SharedGoalOut, status_code=201)
def create_shared_goal(
    data: SharedGoalCreate,
    db: Session = Depends(get_db),
    account: Account = Depends(get_current_account),
):
    """Create a new shared goal."""
    goal = SharedGoal(
        account_id=account.id,
        name=data.name,
        description=data.description or None,
        target_amount=data.target_amount,
        target_date=data.target_date,
        color=data.color,
    )
    db.add(goal)
    db.commit()
    db.refresh(goal)
    return _enrich(goal, _name_map(db, account.id))


@router.put("/{goal_id}", response_model=SharedGoalOut)
def update_shared_goal(
    goal_id: int,
    data: SharedGoalUpdate,
    db: Session = Depends(get_db),
    account: Account = Depends(get_current_account),
):
    """Edit a goal's name, description, target amount, target date, or color."""
    goal = _get_goal_or_404(goal_id, db, account)
    goal.name = data.name
    goal.description = data.description or None
    goal.target_amount = data.target_amount
    goal.target_date = data.target_date
    goal.color = data.color
    db.commit()
    db.refresh(goal)
    return _enrich(goal, _name_map(db, account.id))


@router.delete("/{goal_id}", status_code=204)
def delete_shared_goal(
    goal_id: int,
    db: Session = Depends(get_db),
    account: Account = Depends(get_current_account),
):
    """Delete a goal and all of its contributions (cascade)."""
    goal = _get_goal_or_404(goal_id, db, account)
    db.delete(goal)
    db.commit()


@router.post("/{goal_id}/contribute", response_model=ContributionOut, status_code=201)
def add_contribution(
    goal_id: int,
    data: ContributionCreate,
    db: Session = Depends(get_db),
    account: Account = Depends(get_current_account),
):
    """Record a contribution toward a shared goal."""
    goal = _get_goal_or_404(goal_id, db, account)
    names = _name_map(db, account.id)
    if data.user_id not in names:
        raise HTTPException(404, "User not found")

    c = SharedGoalContribution(
        goal_id=goal.id,
        account_id=account.id,
        user_id=data.user_id,
        amount=data.amount,
        note=data.note or None,
        date=data.date,
    )
    db.add(c)
    db.commit()
    db.refresh(c)
    return ContributionOut(
        id=c.id,
        goal_id=c.goal_id,
        user_id=c.user_id,
        user_name=names.get(c.user_id),
        amount=c.amount,
        note=c.note,
        date=c.date,
        created_at=c.created_at,
    )


@router.delete("/{goal_id}/contributions/{contrib_id}", status_code=204)
def delete_contribution(
    goal_id: int,
    contrib_id: int,
    db: Session = Depends(get_db),
    account: Account = Depends(get_current_account),
):
    """Remove a single contribution."""
    _get_goal_or_404(goal_id, db, account)
    c = (
        db.query(SharedGoalContribution)
        .filter(
            SharedGoalContribution.id == contrib_id,
            SharedGoalContribution.goal_id == goal_id,
            SharedGoalContribution.account_id == account.id,
        )
        .first()
    )
    if not c:
        raise HTTPException(404, "Contribution not found")
    db.delete(c)
    db.commit()


@router.get("/{goal_id}/contributions", response_model=list[ContributionOut])
def list_contributions(
    goal_id: int,
    db: Session = Depends(get_db),
    account: Account = Depends(get_current_account),
):
    """Full contribution history for a goal, newest first."""
    goal = _get_goal_or_404(goal_id, db, account)
    names = _name_map(db, account.id)
    rows = (
        db.query(SharedGoalContribution)
        .filter(SharedGoalContribution.goal_id == goal.id)
        .order_by(
            SharedGoalContribution.date.desc(), SharedGoalContribution.id.desc()
        )
        .all()
    )
    return [
        ContributionOut(
            id=c.id,
            goal_id=c.goal_id,
            user_id=c.user_id,
            user_name=names.get(c.user_id),
            amount=c.amount,
            note=c.note,
            date=c.date,
            created_at=c.created_at,
        )
        for c in rows
    ]
