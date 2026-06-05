"""seed v1.6.0 changelog (Financial Health Score)

Revision ID: c5d6e7f8a9ba
Revises: b4c5d6e7f8a9
Create Date: 2026-06-05 15:00:00.000000

Adds the v1.6.0 changelog row so users who have already seen v1.5.0 get the
What's New panel again on next login, showing only the new v1.6.0 items.
"""
from datetime import date
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c5d6e7f8a9ba'
down_revision: Union[str, Sequence[str], None] = 'b4c5d6e7f8a9'
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
                "version": "1.6.0",
                "title": "Financial Health Score",
                "items": [
                    "New Financial Health Score — get a 0-100 score and letter grade for your finances",
                    "Score breakdown across 5 categories: savings rate, budget adherence, spending trend, goal progress, and settle up",
                    "Personalized tips to improve your score",
                    "Health score trend chart on the Trends page",
                ],
                "released_at": date(2026, 6, 5),
            }
        ],
    )


def downgrade() -> None:
    op.execute("DELETE FROM changelogs WHERE version = '1.6.0'")
