from pydantic import BaseModel


class CategorySpending(BaseModel):
    category_id: int
    category_name: str
    color: str
    spent: float
    budget_limit: float | None


class SummaryOut(BaseModel):
    month: int
    year: int
    total_income: float
    total_spent: float
    remaining: float
    balance_between_users: dict[str, float]
    by_category: list[CategorySpending]
