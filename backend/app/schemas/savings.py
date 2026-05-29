from datetime import date as date_type, datetime
from typing import Literal

from pydantic import BaseModel


class SavingsGoalCreate(BaseModel):
    name: str
    color: str


class SavingsAllocationCreate(BaseModel):
    label: str
    target_amount: float


class SavingsTransactionCreate(BaseModel):
    amount: float
    type: Literal["deposit", "withdrawal"]
    allocation_id: int | None = None
    note: str | None = None
    date: date_type
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
