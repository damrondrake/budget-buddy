from pydantic import BaseModel


class BudgetLineItemCreate(BaseModel):
    label: str
    amount: float


class BudgetLineItemOut(BaseModel):
    id: int
    label: str
    amount: float

    model_config = {"from_attributes": True}


class BudgetCreate(BaseModel):
    category_id: int
    month: int
    year: int
    amount_limit: float
    note: str | None = None


class BudgetOut(BaseModel):
    id: int
    category_id: int
    month: int
    year: int
    amount_limit: float
    note: str | None = None
    category_name: str | None = None
    line_items: list[BudgetLineItemOut] = []

    model_config = {"from_attributes": True}


class BudgetCopy(BaseModel):
    from_month: int
    from_year: int
    to_month: int
    to_year: int


class BudgetCopyResult(BaseModel):
    copied: int
    message: str
