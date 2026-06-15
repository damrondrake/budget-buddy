"""seed v1.8.0 changelog (Reset All Data)

Revision ID: a1b2c3d4e5f6
Revises: f8a9bacbdce4
Create Date: 2026-06-15 09:00:00.000000

Adds the v1.8.0 changelog row so users who have already seen v1.6.0 get the
What's New panel again on next login, showing the new Reset All Data item.
(v1.7.0 was the shelved AI Insights release, removed in f8a9bacbdce4.)
"""
from datetime import date
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = 'f8a9bacbdce4'
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
                "version": "1.8.0",
                "title": "Fresh Start",
                "items": [
                    "Added Reset All Data option in Settings",
                    "Wipe every transaction, budget, goal, and more in one click — without losing your account, login, or custom categories",
                ],
                "released_at": date(2026, 6, 15),
            }
        ],
    )


def downgrade() -> None:
    op.execute("DELETE FROM changelogs WHERE version = '1.8.0'")
