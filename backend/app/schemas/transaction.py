from datetime import date as date_type
from typing import Literal

from pydantic import BaseModel

from app.schemas.common import Amount, BoundedDate, NoteStr

Frequency = Literal["weekly", "monthly", "yearly"]


class TransactionCreate(BaseModel):
    amount: Amount
    category_id: int
    paid_by: int
    is_split: bool = False
    date: BoundedDate
    note: NoteStr | None = None
    # When true, count toward budgets/paid status but don't subtract from the
    # cumulative all-time balance (already paid before entering it here).
    excluded_from_balance: bool = False
    # When true, also create a recurring rule from this transaction.
    make_recurring: bool = False
    recurring_frequency: Frequency | None = None


class TransactionUpdate(BaseModel):
    amount: Amount | None = None
    category_id: int | None = None
    paid_by: int | None = None
    is_split: bool | None = None
    date: BoundedDate | None = None
    note: NoteStr | None = None
    excluded_from_balance: bool | None = None
    # When set, toggles the recurring rule for this transaction: true creates a
    # rule (if not already recurring); false removes it (keeping the transaction).
    make_recurring: bool | None = None
    recurring_frequency: Frequency | None = None


class TransactionOut(BaseModel):
    id: int
    amount: float
    category_id: int
    paid_by: int
    is_split: bool
    date: date_type
    note: str | None
    excluded_from_balance: bool = False
    is_recurring: bool = False
    recurring_id: int | None = None
    category_name: str | None = None
    paid_by_name: str | None = None

    model_config = {"from_attributes": True}
