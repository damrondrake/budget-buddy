"""add waitlist table

Revision ID: c9d0e1f2a3b4
Revises: b8c9d0e1f2a3
Create Date: 2026-06-05 12:00:00.000000

Captures email signups for the upcoming BudgetBuddy Pro launch.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c9d0e1f2a3b4'
down_revision: Union[str, Sequence[str], None] = 'b8c9d0e1f2a3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "waitlist",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("account_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["account_id"], ["accounts.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_waitlist_id"), "waitlist", ["id"], unique=False)
    op.create_index(op.f("ix_waitlist_email"), "waitlist", ["email"], unique=False)
    op.create_index(
        op.f("ix_waitlist_account_id"), "waitlist", ["account_id"], unique=False
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_waitlist_account_id"), table_name="waitlist")
    op.drop_index(op.f("ix_waitlist_email"), table_name="waitlist")
    op.drop_index(op.f("ix_waitlist_id"), table_name="waitlist")
    op.drop_table("waitlist")
