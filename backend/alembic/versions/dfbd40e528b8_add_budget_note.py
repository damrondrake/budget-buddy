"""add budget note

Revision ID: dfbd40e528b8
Revises: e6def8017391
Create Date: 2026-05-28 17:30:10.660576

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'dfbd40e528b8'
down_revision: Union[str, Sequence[str], None] = 'e6def8017391'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("budgets", sa.Column("note", sa.String(length=255), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("budgets") as batch_op:
        batch_op.drop_column("note")
