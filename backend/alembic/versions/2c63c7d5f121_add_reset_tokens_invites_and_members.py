"""add reset/invite tokens and account_members

Revision ID: 2c63c7d5f121
Revises: 65ef27931c8c
Create Date: 2026-06-02 14:05:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "2c63c7d5f121"
down_revision: Union[str, Sequence[str], None] = "65ef27931c8c"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Password-reset + partner-invite tokens live on the accounts table.
    with op.batch_alter_table("accounts") as batch_op:
        batch_op.add_column(sa.Column("reset_token", sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column("reset_token_expires", sa.DateTime(), nullable=True))
        batch_op.add_column(sa.Column("invite_token", sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column("invite_token_expires", sa.DateTime(), nullable=True))
        batch_op.create_index(batch_op.f("ix_accounts_reset_token"), ["reset_token"], unique=False)
        batch_op.create_index(batch_op.f("ix_accounts_invite_token"), ["invite_token"], unique=False)

    # Collaborative accounts: maps additional people (by email) to a shared account.
    op.create_table(
        "account_members",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("account_id", sa.Integer(), nullable=False),
        sa.Column("user_email", sa.String(length=255), nullable=False),
        sa.Column("role", sa.String(length=20), nullable=False),
        sa.Column("joined_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["account_id"], ["accounts.id"], name="fk_account_members_account_id"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_account_members_id"), "account_members", ["id"], unique=False)
    op.create_index(op.f("ix_account_members_account_id"), "account_members", ["account_id"], unique=False)
    op.create_index(op.f("ix_account_members_user_email"), "account_members", ["user_email"], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f("ix_account_members_user_email"), table_name="account_members")
    op.drop_index(op.f("ix_account_members_account_id"), table_name="account_members")
    op.drop_index(op.f("ix_account_members_id"), table_name="account_members")
    op.drop_table("account_members")

    with op.batch_alter_table("accounts") as batch_op:
        batch_op.drop_index(batch_op.f("ix_accounts_invite_token"))
        batch_op.drop_index(batch_op.f("ix_accounts_reset_token"))
        batch_op.drop_column("invite_token_expires")
        batch_op.drop_column("invite_token")
        batch_op.drop_column("reset_token_expires")
        batch_op.drop_column("reset_token")
