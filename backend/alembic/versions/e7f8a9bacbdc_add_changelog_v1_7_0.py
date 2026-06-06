"""seed v1.7.0 changelog (BudgetBuddy AI Insights)

Revision ID: e7f8a9bacbdc
Revises: d6e7f8a9bacb
Create Date: 2026-06-05 16:30:00.000000

Adds the v1.7.0 changelog row so users who have already seen v1.6.0 get the
What's New panel again on next login, showing only the new v1.7.0 items.
"""
from datetime import date
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e7f8a9bacbdc'
down_revision: Union[str, Sequence[str], None] = 'd6e7f8a9bacb'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    changelogs = sa.table(
        "changelogs",
        sa.column("version", sa.String),
        sa.column("title", sa.String),
        sa.column("items", sa.JSON),
        sa.column("released_at", sa.Date),
    )
    op.bulk_insert(
        changelogs,
        [
            {
                "version": "1.7.0",
                "title": "BudgetBuddy AI Insights",
                "items": [
                    "New AI-powered spending insights on your Dashboard",
                    "Get personalized, plain English analysis of your spending habits",
                    "Data-driven tips to improve your financial health",
                    "Insights refresh automatically every 24 hours",
                ],
                "released_at": date(2026, 6, 5),
            }
        ],
    )


def downgrade() -> None:
    op.execute("DELETE FROM changelogs WHERE version = '1.7.0'")
