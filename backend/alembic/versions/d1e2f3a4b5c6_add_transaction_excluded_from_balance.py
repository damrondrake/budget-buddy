"""add transaction excluded_from_balance

Revision ID: d1e2f3a4b5c6
Revises: b2c3d4e5f6a7
Create Date: 2026-07-19 12:00:00.000000

Adds a per-transaction ``excluded_from_balance`` flag. When true the transaction
still counts toward monthly budgets and the "paid" flow, but is left out of the
cumulative all-time balance, so something paid in real life before it was entered
here isn't subtracted from the balance a second time.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd1e2f3a4b5c6'
down_revision: Union[str, Sequence[str], None] = 'b2c3d4e5f6a7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    with op.batch_alter_table('transactions') as batch_op:
        batch_op.add_column(sa.Column('excluded_from_balance', sa.Boolean(), server_default='0', nullable=False))


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('transactions') as batch_op:
        batch_op.drop_column('excluded_from_balance')
