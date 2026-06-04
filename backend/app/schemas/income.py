from pydantic import BaseModel

from app.schemas.common import Amount, Label100


class IncomeCreate(BaseModel):
    user_id: int
    amount: Amount
    source: Label100
    month: int
    year: int


class IncomeUpdate(BaseModel):
    user_id: int
    amount: Amount
    source: Label100


class IncomeOut(BaseModel):
    id: int
    user_id: int
    amount: float
    source: str
    month: int
    year: int
    user_name: str | None = None
    # 'income' or 'starting_balance'; lets the UI render the locked SB entry.
    type: str = "income"

    model_config = {"from_attributes": True}
