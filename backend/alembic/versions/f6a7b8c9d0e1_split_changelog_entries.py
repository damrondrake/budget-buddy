"""split changelog into accurate v1.0.0 (launch) and v1.1.0 (post-launch)

Revision ID: f6a7b8c9d0e1
Revises: e5f6a7b8c9d0
Create Date: 2026-06-04 16:30:00.000000

Corrects the two changelog rows so they don't overlap: v1.0.0 lists only the
original launch features (including starting balance and basic recurring), and
v1.1.0 lists only what was genuinely added after launch. A user who already saw
v1.0.0 will then be shown just the v1.1.0 items.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f6a7b8c9d0e1'
down_revision: Union[str, Sequence[str], None] = 'e5f6a7b8c9d0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


V1_0_0_ITEMS = [
    "Track expenses with categories, notes, dates, and split-by-person support",
    "Build monthly category budgets with detailed line items and Mark-as-Paid tracking",
    "Record income from multiple sources",
    "Set up recurring transactions for regular bills and income",
    "Create savings goals with allocations and a full deposit/withdrawal log",
    "Visualize where your money goes with interactive spending trends",
    "Share an account with a partner and manage your finances together",
    "Reset your password securely by email",
    "Set a starting balance so your totals reflect what you already had",
]

V1_1_0_ITEMS = [
    "Completed a Row Level Security audit — every account's data is verified isolated from everyone else's",
    "Recurring transactions now support weekly, monthly, and yearly frequencies",
    "Recurring transactions are applied automatically when you log in",
    "Forms now remember your in-progress drafts if you navigate away or refresh",
    "Added this What's New panel to announce new features",
    "Added automated backend and frontend test suites for reliability",
]

# Original (overlapping) item lists, restored on downgrade.
_OLD_V1_0_0 = [
    "Track expenses with categories, notes, dates, and split-by-person support",
    "Build monthly category budgets with detailed line items and Mark-as-Paid tracking",
    "Record income from multiple sources",
    "Set up recurring transactions (weekly, monthly, or yearly) — now applied automatically when you log in",
    "Create savings goals with allocations and a full deposit/withdrawal log",
    "Visualize where your money goes with interactive spending trends",
    "Share an account with a partner and manage your finances together",
    "Reset your password securely by email",
    "Set a starting balance so your totals reflect what you already had",
]
_OLD_V1_1_0 = [
    "Completed a Row Level Security audit — every account's data is verified isolated from everyone else's",
    "Recurring transactions now support weekly, monthly, and yearly frequencies",
    "Recurring transactions are applied automatically when you log in",
    "Added a starting balance so your totals reflect what you already had",
    "Forms now remember your in-progress drafts if you navigate away or refresh",
    "Added this What's New panel to announce new features",
    "Added automated backend and frontend test suites for reliability",
]

changelogs = sa.table(
    "changelogs",
    sa.column("version", sa.String),
    sa.column("title", sa.String),
    sa.column("items", sa.JSON),
)


def _set_items(version: str, title: str, items: list[str]) -> None:
    op.execute(
        changelogs.update()
        .where(changelogs.c.version == version)
        .values(title=title, items=items)
    )


def upgrade() -> None:
    _set_items("1.0.0", "Welcome to BudgetBuddy!", V1_0_0_ITEMS)
    _set_items("1.1.0", "Security & Feature Update", V1_1_0_ITEMS)


def downgrade() -> None:
    _set_items("1.0.0", "Welcome to BudgetBuddy!", _OLD_V1_0_0)
    _set_items("1.1.0", "Security & Feature Update", _OLD_V1_1_0)
