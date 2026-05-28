from pydantic import BaseModel


class RecurringCreate(BaseModel):
    amount: float
    category_id: int
    paid_by: int
    is_split: bool = False
    day_of_month: int
    note: str


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
