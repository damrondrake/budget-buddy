from datetime import date as date_type, datetime
from typing import Literal

from pydantic import BaseModel

from app.schemas.common import BoundedDate, Label100, NoteStr, PositiveAmount, TargetAmount


class SavingsGoalCreate(BaseModel):
    name: Label100
    color: str


class SavingsAllocationCreate(BaseModel):
    label: Label100
    target_amount: TargetAmount


class SavingsTransactionCreate(BaseModel):
    amount: PositiveAmount
    type: Literal["deposit", "withdrawal"]
    allocation_id: int | None = None
    note: NoteStr | None = None
    date: BoundedDate
    # Required for deposits — the user who paid into savings (recorded as a
    # regular transaction). Ignored for withdrawals.
    paid_by: int | None = None


class SavingsAllocationOut(BaseModel):
    id: int
    label: str
    target_amount: float
    saved: float


class SavingsTransactionOut(BaseModel):
    id: int
    goal_id: int
    allocation_id: int | None
    allocation_label: str | None
    amount: float
    type: str
    note: str | None
    date: date_type


class SavingsGoalOut(BaseModel):
    id: int
    name: str
    color: str
    created_at: datetime
    total_target: float
    total_saved: float
    allocations: list[SavingsAllocationOut]
