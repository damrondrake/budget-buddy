from pydantic import BaseModel


class IncomeCreate(BaseModel):
    user_id: int
    amount: float
    source: str
    month: int
    year: int


class IncomeOut(BaseModel):
    id: int
    user_id: int
    amount: float
    source: str
    month: int
    year: int
    user_name: str | None = None

    model_config = {"from_attributes": True}
