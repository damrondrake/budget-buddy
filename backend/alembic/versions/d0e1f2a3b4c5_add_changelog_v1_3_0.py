"""seed v1.3.0 changelog (BudgetBuddy Pro Coming Soon)

Revision ID: d0e1f2a3b4c5
Revises: c9d0e1f2a3b4
Create Date: 2026-06-05 12:30:00.000000

Adds the v1.3.0 changelog row so users who have already seen v1.2.0 get the
What's New panel again on next login, showing only the new v1.3.0 items.
"""
from datetime import date
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd0e1f2a3b4c5'
down_revision: Union[str, Sequence[str], None] = 'c9d0e1f2a3b4'
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
                "version": "1.3.0",
                "title": "BudgetBuddy Pro Coming Soon",
                "items": [
                    "Pro plan announced with bank sync, AI insights, and more coming soon",
                    "Free plan clarified — all core features free forever including collaborative accounts",
                    "Support contact added",
                ],
                "released_at": date(2026, 6, 5),
            }
        ],
    )


def downgrade() -> None:
    op.execute("DELETE FROM changelogs WHERE version = '1.3.0'")
