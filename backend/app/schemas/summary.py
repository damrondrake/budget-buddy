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


class BudgetCoverage(BaseModel):
    # Sum over budgeted categories of max(budget_limit - spent, 0): what's still
    # left to pay against this month's budgets.
    remaining_obligations: float
    # The account's current cumulative net balance (all-time income - spending).
    available_balance: float
    # available_balance - remaining_obligations: what's left after covering the
    # month's remaining budgets.
    projected_balance: float
    # "on_track" when projected_balance >= 0, else "short".
    status: str


class SummaryOut(BaseModel):
    month: int
    year: int
    total_income: float
    total_spent: float
    remaining: float
    balance_between_users: dict[str, float]
    by_category: list[CategorySpending]
    budget_coverage: BudgetCoverage


class CumulativeOut(BaseModel):
    total_income: float
    total_spending: float
    net_balance: float
    # Account-wide savings balance (deposits minus withdrawals). Informational:
    # it's already excluded from net_balance since deposits are real transactions.
    total_saved: float
