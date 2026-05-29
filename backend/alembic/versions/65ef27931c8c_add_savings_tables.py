"""add savings tables

Revision ID: 65ef27931c8c
Revises: 07ce0cfba4df
Create Date: 2026-05-29 00:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '65ef27931c8c'
down_revision: Union[str, Sequence[str], None] = '07ce0cfba4df'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "savings_goals",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("account_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("color", sa.String(length=7), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["account_id"], ["accounts.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_savings_goals_id"), "savings_goals", ["id"], unique=False)

    op.create_table(
        "savings_allocations",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("goal_id", sa.Integer(), nullable=False),
        sa.Column("account_id", sa.Integer(), nullable=False),
        sa.Column("label", sa.String(length=100), nullable=False),
        sa.Column("target_amount", sa.Float(), nullable=False),
        sa.ForeignKeyConstraint(["goal_id"], ["savings_goals.id"]),
        sa.ForeignKeyConstraint(["account_id"], ["accounts.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_savings_allocations_id"), "savings_allocations", ["id"], unique=False
    )

    op.create_table(
        "savings_transactions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("goal_id", sa.Integer(), nullable=False),
        sa.Column("allocation_id", sa.Integer(), nullable=True),
        sa.Column("account_id", sa.Integer(), nullable=False),
        sa.Column("amount", sa.Float(), nullable=False),
        sa.Column("type", sa.String(length=20), nullable=False),
        sa.Column("note", sa.String(length=255), nullable=True),
        sa.Column("date", sa.Date(), nullable=False),
        sa.ForeignKeyConstraint(["goal_id"], ["savings_goals.id"]),
        sa.ForeignKeyConstraint(["allocation_id"], ["savings_allocations.id"]),
        sa.ForeignKeyConstraint(["account_id"], ["accounts.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_savings_transactions_id"), "savings_transactions", ["id"], unique=False
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_savings_transactions_id"), table_name="savings_transactions")
    op.drop_table("savings_transactions")
    op.drop_index(op.f("ix_savings_allocations_id"), table_name="savings_allocations")
    op.drop_table("savings_allocations")
    op.drop_index(op.f("ix_savings_goals_id"), table_name="savings_goals")
    op.drop_table("savings_goals")
