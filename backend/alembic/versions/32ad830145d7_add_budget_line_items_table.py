"""add budget line items table

Revision ID: 32ad830145d7
Revises: dfbd40e528b8
Create Date: 2026-05-28 20:29:22.492403

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '32ad830145d7'
down_revision: Union[str, Sequence[str], None] = 'dfbd40e528b8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "budget_line_items",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("budget_id", sa.Integer(), nullable=False),
        sa.Column("label", sa.String(length=100), nullable=False),
        sa.Column("amount", sa.Float(), nullable=False),
        sa.Column("account_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["budget_id"], ["budgets.id"]),
        sa.ForeignKeyConstraint(["account_id"], ["accounts.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_budget_line_items_id"), "budget_line_items", ["id"], unique=False
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_budget_line_items_id"), table_name="budget_line_items")
    op.drop_table("budget_line_items")
