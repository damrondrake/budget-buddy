"""seed v1.5.0 changelog (Shared Financial Goals)

Revision ID: b4c5d6e7f8a9
Revises: a3b4c5d6e7f8
Create Date: 2026-06-05 14:30:00.000000

Adds the v1.5.0 changelog row so users who have already seen v1.4.0 get the
What's New panel again on next login, showing only the new v1.5.0 items.
"""
from datetime import date
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b4c5d6e7f8a9'
down_revision: Union[str, Sequence[str], None] = 'a3b4c5d6e7f8'
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
                "version": "1.5.0",
                "title": "Shared Financial Goals",
                "items": [
                    "New Goals page — set shared financial targets with your partner",
                    "Track each person's contributions toward shared goals",
                    "Contribution history and progress tracking with target dates",
                ],
                "released_at": date(2026, 6, 5),
            }
        ],
    )


def downgrade() -> None:
    op.execute("DELETE FROM changelogs WHERE version = '1.5.0'")
