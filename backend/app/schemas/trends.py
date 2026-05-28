from pydantic import BaseModel


class CategoryMonthSpending(BaseModel):
    category_id: int
    category_name: str
    color: str
    amount: float


class MonthData(BaseModel):
    month: int
    year: int
    label: str
    total_spent: float
    total_income: float
    categories: list[CategoryMonthSpending]


class TrendsOut(BaseModel):
    months: list[MonthData]
