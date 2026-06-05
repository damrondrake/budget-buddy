from pydantic import BaseModel


class CategorySpending(BaseModel):
    category_id: int
    category_name: str
    color: str
    spent: float
    budget_limit: float | None
    # Budget reference + paid status, so the Dashboard can mark a budget paid
    # and color its bar the same way the Budgets page does. None when the
    # category has no budget this month.
    budget_id: int | None = None
    paid: bool = False


class SummaryOut(BaseModel):
    month: int
    year: int
    total_income: float
    total_spent: float
    remaining: float
    balance_between_users: dict[str, float]
    by_category: list[CategorySpending]


class CumulativeOut(BaseModel):
    total_income: float
    total_spending: float
    net_balance: float
