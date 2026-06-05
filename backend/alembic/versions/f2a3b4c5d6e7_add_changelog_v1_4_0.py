"""seed v1.4.0 changelog (Settle Up)

Revision ID: f2a3b4c5d6e7
Revises: e1f2a3b4c5d6
Create Date: 2026-06-05 13:30:00.000000

Adds the v1.4.0 changelog row so users who have already seen v1.3.0 get the
What's New panel again on next login, showing only the new v1.4.0 items.
"""
from datetime import date
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f2a3b4c5d6e7'
down_revision: Union[str, Sequence[str], None] = 'e1f2a3b4c5d6'
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
                "version": "1.4.0",
                "title": "Settle Up",
                "items": [
                    "New Settle Up flow — record settlement payments between partners with one tap",
                    "Settlement history visible on Dashboard and Transactions page",
                    "Split balance now accounts for settlements automatically",
                ],
                "released_at": date(2026, 6, 5),
            }
        ],
    )


def downgrade() -> None:
    op.execute("DELETE FROM changelogs WHERE version = '1.4.0'")
