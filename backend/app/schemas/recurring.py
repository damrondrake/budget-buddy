from typing import Literal

from pydantic import BaseModel

from app.schemas.common import Amount, DayOfMonth, NoteStr

Frequency = Literal["weekly", "monthly", "yearly"]


class RecurringCreate(BaseModel):
    amount: Amount
    category_id: int
    paid_by: int
    is_split: bool = False
    day_of_month: DayOfMonth
    note: NoteStr
    frequency: Frequency = "monthly"
    # Anchor month for yearly rules; ignored for weekly/monthly.
    month_of_year: int | None = None


class RecurringOut(BaseModel):
    id: int
    amount: float
    category_id: int
    paid_by: int
    is_split: bool
    day_of_month: int
    note: str
    frequency: str
    month_of_year: int | None = None
    category_name: str | None = None
    paid_by_name: str | None = None

    model_config = {"from_attributes": True}
