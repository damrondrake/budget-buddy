from datetime import date as date_type, datetime

from pydantic import BaseModel

from app.schemas.common import Amount, BoundedDate, Label100, NoteStr, PositiveAmount


class SharedGoalCreate(BaseModel):
    name: Label100
    description: NoteStr | None = None
    target_amount: Amount
    target_date: BoundedDate | None = None
    color: str


class SharedGoalUpdate(BaseModel):
    name: Label100
    description: NoteStr | None = None
    target_amount: Amount
    target_date: BoundedDate | None = None
    color: str


class ContributionCreate(BaseModel):
    user_id: int
    amount: PositiveAmount
    note: NoteStr | None = None
    date: BoundedDate


class ContributionOut(BaseModel):
    id: int
    goal_id: int
    user_id: int
    user_name: str | None = None
    amount: float
    note: str | None = None
    date: date_type
    created_at: datetime


class UserContribution(BaseModel):
    user_id: int
    user_name: str
    amount: float


class SharedGoalOut(BaseModel):
    id: int
    name: str
    description: str | None = None
    target_amount: float
    target_date: date_type | None = None
    color: str
    created_at: datetime
    # Computed aggregates
    total_contributed: float
    remaining: float
    percent_complete: float
    is_complete: bool
    by_user: list[UserContribution]
