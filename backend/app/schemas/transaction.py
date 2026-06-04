from datetime import date as date_type
from pydantic import BaseModel

from app.schemas.common import Amount, BoundedDate, NoteStr


class TransactionCreate(BaseModel):
    amount: Amount
    category_id: int
    paid_by: int
    is_split: bool = False
    date: BoundedDate
    note: NoteStr | None = None


class TransactionUpdate(BaseModel):
    amount: Amount | None = None
    category_id: int | None = None
    paid_by: int | None = None
    is_split: bool | None = None
    date: BoundedDate | None = None
    note: NoteStr | None = None


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
