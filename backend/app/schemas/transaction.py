from datetime import date as date_type
from pydantic import BaseModel


class TransactionCreate(BaseModel):
    amount: float
    category_id: int
    paid_by: int
    is_split: bool = False
    date: date_type
    note: str | None = None


class TransactionUpdate(BaseModel):
    amount: float | None = None
    category_id: int | None = None
    paid_by: int | None = None
    is_split: bool | None = None
    date: date_type | None = None
    note: str | None = None


class TransactionOut(BaseModel):
    id: int
    amount: float
    category_id: int
    paid_by: int
    is_split: bool
    date: date_type
    note: str | None
    is_recurring: bool = False
    recurring_id: int | None = None
    category_name: str | None = None
    paid_by_name: str | None = None

    model_config = {"from_attributes": True}
