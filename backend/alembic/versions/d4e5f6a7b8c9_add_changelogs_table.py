"""add changelogs table and seed v1.0.0

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2026-06-04 14:00:00.000000

"""
from datetime import date
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd4e5f6a7b8c9'
down_revision: Union[str, Sequence[str], None] = 'c3d4e5f6a7b8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "changelogs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("version", sa.String(length=20), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("items", sa.JSON(), nullable=False),
        sa.Column("released_at", sa.Date(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_changelogs_id"), "changelogs", ["id"], unique=False)

    # Seed the first real changelog so every existing/new user sees it on login.
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
                "version": "1.0.0",
                "title": "Welcome to BudgetBuddy!",
                "items": [
                    "Track expenses with categories, notes, dates, and split-by-person support",
                    "Build monthly category budgets with detailed line items and Mark-as-Paid tracking",
                    "Record income from multiple sources",
                    "Set up recurring transactions (weekly, monthly, or yearly) — now applied automatically when you log in",
                    "Create savings goals with allocations and a full deposit/withdrawal log",
                    "Visualize where your money goes with interactive spending trends",
                    "Share an account with a partner and manage your finances together",
                    "Reset your password securely by email",
                    "Set a starting balance so your totals reflect what you already had",
                ],
                "released_at": date(2026, 6, 4),
            }
        ],
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_changelogs_id"), table_name="changelogs")
    op.drop_table("changelogs")
