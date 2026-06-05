"""seed v1.1.0 changelog (Security & Feature Update)

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-06-04 15:30:00.000000

"""
from datetime import date
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e5f6a7b8c9d0'
down_revision: Union[str, Sequence[str], None] = 'd4e5f6a7b8c9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Bumps the latest changelog to 1.1.0 so everyone who already saw 1.0.0 gets
    # the What's New modal again on next login.
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
                "version": "1.1.0",
                "title": "Security & Feature Update",
                "items": [
                    "Completed a Row Level Security audit — every account's data is verified isolated from everyone else's",
                    "Recurring transactions now support weekly, monthly, and yearly frequencies",
                    "Recurring transactions are applied automatically when you log in",
                    "Added a starting balance so your totals reflect what you already had",
                    "Forms now remember your in-progress drafts if you navigate away or refresh",
                    "Added this What's New panel to announce new features",
                    "Added automated backend and frontend test suites for reliability",
                ],
                "released_at": date(2026, 6, 4),
            }
        ],
    )


def downgrade() -> None:
    op.execute("DELETE FROM changelogs WHERE version = '1.1.0'")
