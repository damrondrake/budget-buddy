from pydantic import BaseModel

from app.schemas.common import Amount, Label100, NonNegativeAmount, NoteStr


class BudgetLineItemCreate(BaseModel):
    label: Label100
    amount: Amount


class BudgetLineItemOut(BaseModel):
    id: int
    label: str
    amount: float

    model_config = {"from_attributes": True}


class BudgetCreate(BaseModel):
    category_id: int
    month: int
    year: int
    amount_limit: NonNegativeAmount
    note: NoteStr | None = None


class BudgetOut(BaseModel):
    id: int
    category_id: int
    month: int
    year: int
    amount_limit: float
    note: str | None = None
    paid: bool = False
    category_name: str | None = None
    line_items: list[BudgetLineItemOut] = []

    model_config = {"from_attributes": True}


class BudgetPaidUpdate(BaseModel):
    paid: bool


class BudgetCopy(BaseModel):
    from_month: int
    from_year: int
    to_month: int
    to_year: int


class BudgetCopyResult(BaseModel):
    copied: int
    message: str
