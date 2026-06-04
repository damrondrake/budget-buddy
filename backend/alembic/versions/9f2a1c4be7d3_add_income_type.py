"""add income type for starting balance

Revision ID: 9f2a1c4be7d3
Revises: 2c63c7d5f121
Create Date: 2026-06-04 12:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9f2a1c4be7d3'
down_revision: Union[str, Sequence[str], None] = '2c63c7d5f121'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 'income' for normal entries; 'starting_balance' for the one-time, locked
    # account opening balance. server_default backfills all existing rows.
    op.add_column(
        "income",
        sa.Column("type", sa.String(length=20), nullable=False, server_default="income"),
    )


def downgrade() -> None:
    with op.batch_alter_table("income") as batch_op:
        batch_op.drop_column("type")
