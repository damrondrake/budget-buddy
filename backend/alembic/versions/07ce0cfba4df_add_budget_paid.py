"""add budget paid

Revision ID: 07ce0cfba4df
Revises: 32ad830145d7
Create Date: 2026-05-29 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '07ce0cfba4df'
down_revision: Union[str, Sequence[str], None] = '32ad830145d7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "budgets",
        sa.Column("paid", sa.Boolean(), nullable=False, server_default="0"),
    )


def downgrade() -> None:
    with op.batch_alter_table("budgets") as batch_op:
        batch_op.drop_column("paid")
