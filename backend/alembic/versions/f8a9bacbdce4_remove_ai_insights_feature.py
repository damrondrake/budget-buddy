"""remove AI insights feature

Revision ID: f8a9bacbdce4
Revises: e7f8a9bacbdc
Create Date: 2026-06-05 17:30:00.000000

Reverses the AI insights feature (added in d6e7f8a9bacb + e7f8a9bacbdc): drops
the insights_cache table and removes the v1.7.0 "BudgetBuddy AI Insights"
changelog row, since the feature is being shelved before launch.

Forward-only: the original migrations are kept intact (deploys run
`alembic upgrade head`, and any environment that already applied them would
break if their revisions vanished from history). This migration cleanly undoes
their effect instead.
"""
from datetime import date
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f8a9bacbdce4'
down_revision: Union[str, Sequence[str], None] = 'e7f8a9bacbdc'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Remove the changelog row first (no-op if it was never seeded).
    op.execute("DELETE FROM changelogs WHERE version = '1.7.0'")
    # Drop the cache table and its indexes.
    op.drop_index(op.f("ix_insights_cache_account_id"), table_name="insights_cache")
    op.drop_index(op.f("ix_insights_cache_id"), table_name="insights_cache")
    op.drop_table("insights_cache")


def downgrade() -> None:
    # Recreate the table exactly as d6e7f8a9bacb did.
    op.create_table(
        "insights_cache",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("account_id", sa.Integer(), nullable=False),
        sa.Column("month", sa.Integer(), nullable=False),
        sa.Column("year", sa.Integer(), nullable=False),
        sa.Column("insights", sa.JSON(), nullable=False),
        sa.Column("generated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["account_id"], ["accounts.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_insights_cache_id"), "insights_cache", ["id"], unique=False)
    op.create_index(
        op.f("ix_insights_cache_account_id"), "insights_cache", ["account_id"], unique=False
    )
    # Restore the v1.7.0 changelog row.
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
                "version": "1.7.0",
                "title": "BudgetBuddy AI Insights",
                "items": [
                    "New AI-powered spending insights on your Dashboard",
                    "Get personalized, plain English analysis of your spending habits",
                    "Data-driven tips to improve your financial health",
                    "Insights refresh automatically every 24 hours",
                ],
                "released_at": date(2026, 6, 5),
            }
        ],
    )
