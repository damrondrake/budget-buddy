"""seed v1.10.0 changelog (invite sign-up fix)

Revision ID: c4d5e6f7a8b9
Revises: b2c3d4e5f6a7
Create Date: 2026-07-14 12:00:00.000000

Adds the v1.10.0 changelog row noting the fix to the partner-invite sign-up
flow, where a too-short password produced a broken error screen.
"""
from datetime import date
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c4d5e6f7a8b9'
down_revision: Union[str, Sequence[str], None] = 'b2c3d4e5f6a7'
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
                "version": "1.10.0",
                "title": "Smoother partner sign-up",
                "items": [
                    "Fixed a bug where accepting a partner invite could show a broken error screen instead of a helpful message.",
                    "Password rules are now consistent across sign-up, invites, and password reset (minimum 8 characters), with clearer guidance.",
                ],
                "released_at": date(2026, 7, 14),
            }
        ],
    )


def downgrade() -> None:
    op.execute("DELETE FROM changelogs WHERE version = '1.10.0'")
