"""seed v1.11.0 changelog (Balance clarity, budget coverage, already-paid toggle)

Revision ID: e2f3a4b5c6d7
Revises: d1e2f3a4b5c6
Create Date: 2026-07-19 12:30:00.000000

Adds the v1.11.0 changelog row so users get the What's New panel on next login,
covering the Balance Breakdown + Move to Savings card, the Budget Coverage card,
and the "already paid — don't affect balance" toggle.
"""
from datetime import date
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e2f3a4b5c6d7'
down_revision: Union[str, Sequence[str], None] = 'd1e2f3a4b5c6'
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
                "version": "1.11.0",
                "title": "Clearer Balance & Budget Coverage",
                "items": [
                    "Your dashboard now splits your money into Available Balance and In Savings, so you can see what's actually spendable at a glance.",
                    "Move money into savings right from the dashboard with the new Move to Savings button — no need to set up a goal first.",
                    "A new Budget Coverage card tells you whether your available balance can cover everything left to pay this month, and by how much you're ahead or short.",
                    "When adding a transaction or marking a budget paid, you can now flag things you already paid before tracking them here so they don't get subtracted from your balance twice.",
                ],
                "released_at": date(2026, 7, 19),
            }
        ],
    )


def downgrade() -> None:
    op.execute("DELETE FROM changelogs WHERE version = '1.11.0'")
