"""add insights cache table

Revision ID: d6e7f8a9bacb
Revises: c5d6e7f8a9ba
Create Date: 2026-06-05 16:00:00.000000

Caches AI-generated spending insights per account/month for 24 hours so the
Anthropic API isn't called on every Dashboard load.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd6e7f8a9bacb'
down_revision: Union[str, Sequence[str], None] = 'c5d6e7f8a9ba'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
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


def downgrade() -> None:
    op.drop_index(op.f("ix_insights_cache_account_id"), table_name="insights_cache")
    op.drop_index(op.f("ix_insights_cache_id"), table_name="insights_cache")
    op.drop_table("insights_cache")
