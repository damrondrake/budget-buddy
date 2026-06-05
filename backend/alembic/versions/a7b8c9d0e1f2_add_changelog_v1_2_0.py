"""seed v1.2.0 changelog (Real-Time Sync & Polish)

Revision ID: a7b8c9d0e1f2
Revises: f6a7b8c9d0e1
Create Date: 2026-06-05 10:00:00.000000

Adds the v1.2.0 changelog row so users who have already seen v1.1.0 get the
What's New panel again on next login, showing only the new v1.2.0 items.
"""
from datetime import date
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a7b8c9d0e1f2'
down_revision: Union[str, Sequence[str], None] = 'f6a7b8c9d0e1'
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
                "version": "1.2.0",
                "title": "Real-Time Sync & Polish",
                "items": [
                    "Shared accounts now auto-refresh every 30 seconds — changes made by your partner appear automatically",
                    "What's New announcements now only show features you haven't seen before",
                    "Automatic recurring transactions applied on login",
                    "Starting balance feature — add existing savings to your cumulative total",
                    "Failure-path security tests added — rate limiting and account protection verified",
                ],
                "released_at": date(2026, 6, 5),
            }
        ],
    )


def downgrade() -> None:
    op.execute("DELETE FROM changelogs WHERE version = '1.2.0'")
