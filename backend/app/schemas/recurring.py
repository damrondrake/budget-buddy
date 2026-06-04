from pydantic import BaseModel

from app.schemas.common import Amount, DayOfMonth, NoteStr


class RecurringCreate(BaseModel):
    amount: Amount
    category_id: int
    paid_by: int
    is_split: bool = False
    day_of_month: DayOfMonth
    note: NoteStr


class RecurringOut(BaseModel):
    id: int
    amount: float
    category_id: int
    paid_by: int
    is_split: bool
    day_of_month: int
    note: str
    category_name: str | None = None
    paid_by_name: str | None = None

    model_config = {"from_attributes": True}
