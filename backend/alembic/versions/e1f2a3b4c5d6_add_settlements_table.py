"""add settlements table

Revision ID: e1f2a3b4c5d6
Revises: d0e1f2a3b4c5
Create Date: 2026-06-05 13:00:00.000000

Records settlement payments between two people on a shared account, used to zero
out the running split balance.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e1f2a3b4c5d6'
down_revision: Union[str, Sequence[str], None] = 'd0e1f2a3b4c5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "settlements",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("account_id", sa.Integer(), nullable=False),
        sa.Column("paid_by", sa.Integer(), nullable=False),
        sa.Column("paid_to", sa.Integer(), nullable=False),
        sa.Column("amount", sa.Float(), nullable=False),
        sa.Column("note", sa.String(length=255), nullable=True),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["account_id"], ["accounts.id"]),
        sa.ForeignKeyConstraint(["paid_by"], ["users.id"]),
        sa.ForeignKeyConstraint(["paid_to"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_settlements_id"), "settlements", ["id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_settlements_id"), table_name="settlements")
    op.drop_table("settlements")
