"""add frequency to recurring transactions

Revision ID: c3d4e5f6a7b8
Revises: 9f2a1c4be7d3
Create Date: 2026-06-04 13:15:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c3d4e5f6a7b8'
down_revision: Union[str, Sequence[str], None] = '9f2a1c4be7d3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 'weekly' | 'monthly' | 'yearly'. Existing rows were monthly-only, so
    # server_default backfills them to 'monthly'.
    op.add_column(
        "recurring_transactions",
        sa.Column("frequency", sa.String(length=10), nullable=False, server_default="monthly"),
    )
    # Anchor month for yearly rules (1-12), so a yearly rule only fires in its
    # correct month. Nullable; unused by weekly/monthly.
    op.add_column(
        "recurring_transactions",
        sa.Column("month_of_year", sa.Integer(), nullable=True),
    )


def downgrade() -> None:
    with op.batch_alter_table("recurring_transactions") as batch_op:
        batch_op.drop_column("month_of_year")
        batch_op.drop_column("frequency")
