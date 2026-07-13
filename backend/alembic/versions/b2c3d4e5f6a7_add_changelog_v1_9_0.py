"""seed v1.9.0 changelog (Terms of Service)

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-06-15 12:00:00.000000

Adds the v1.9.0 changelog row so users get the What's New panel on next login,
noting the new Terms of Service page.
"""
from datetime import date
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, Sequence[str], None] = 'a1b2c3d4e5f6'
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
                "version": "1.9.0",
                "title": "Terms of Service",
                "items": [
                    "Added Terms of Service",
                ],
                "released_at": date(2026, 6, 15),
            }
        ],
    )


def downgrade() -> None:
    op.execute("DELETE FROM changelogs WHERE version = '1.9.0'")
