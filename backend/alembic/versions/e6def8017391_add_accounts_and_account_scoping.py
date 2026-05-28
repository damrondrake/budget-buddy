"""add accounts and account scoping

Revision ID: e6def8017391
Revises: 349e24a2edfd
Create Date: 2026-05-28 12:28:48.255068

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

from app.auth import hash_password


# revision identifiers, used by Alembic.
revision: str = 'e6def8017391'
down_revision: Union[str, Sequence[str], None] = '349e24a2edfd'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


SCOPED_TABLES = [
    "users",
    "categories",
    "budgets",
    "transactions",
    "income",
    "recurring_transactions",
]


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "accounts",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("hashed_password", sa.String(length=255), nullable=False),
        sa.Column("display_name", sa.String(length=100), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
    )
    op.create_index(op.f("ix_accounts_id"), "accounts", ["id"], unique=False)

    conn = op.get_bind()
    has_existing_rows = False
    for table in SCOPED_TABLES:
        count = conn.execute(sa.text(f"SELECT COUNT(*) FROM {table}")).scalar()
        if count:
            has_existing_rows = True
            break

    legacy_account_id = None
    if has_existing_rows:
        result = conn.execute(
            sa.text(
                "INSERT INTO accounts (email, hashed_password, display_name) "
                "VALUES (:email, :pw, :name)"
            ),
            {
                "email": "legacy@local",
                "pw": hash_password("changeme"),
                "name": "Legacy",
            },
        )
        legacy_account_id = result.lastrowid

    for table in SCOPED_TABLES:
        with op.batch_alter_table(table) as batch_op:
            batch_op.add_column(sa.Column("account_id", sa.Integer(), nullable=True))

    if legacy_account_id is not None:
        for table in SCOPED_TABLES:
            conn.execute(
                sa.text(f"UPDATE {table} SET account_id = :aid WHERE account_id IS NULL"),
                {"aid": legacy_account_id},
            )

    for table in SCOPED_TABLES:
        with op.batch_alter_table(table) as batch_op:
            batch_op.alter_column(
                "account_id", existing_type=sa.Integer(), nullable=False
            )
            batch_op.create_foreign_key(
                f"fk_{table}_account_id", "accounts", ["account_id"], ["id"]
            )

    # The original schema put a global UNIQUE on users.name and categories.name.
    # With per-account scoping those names only need to be unique within an account,
    # so drop the global constraints to make seeding new accounts possible.
    # Handle dialects separately: PG names the constraint <table>_<col>_key by default
    # and supports IF EXISTS; SQLite can't drop constraints in place at all and needs
    # batch_alter_table to recreate the table.
    dialect = op.get_bind().dialect.name
    if dialect == "postgresql":
        for table in ("users", "categories"):
            op.execute(f'ALTER TABLE {table} DROP CONSTRAINT IF EXISTS {table}_name_key')
            op.execute(f'ALTER TABLE {table} DROP CONSTRAINT IF EXISTS uq_{table}_name')
    elif dialect == "sqlite":
        naming_convention = {"uq": "uq_%(table_name)s_%(column_0_name)s"}
        for table in ("users", "categories"):
            try:
                with op.batch_alter_table(table, naming_convention=naming_convention) as batch_op:
                    batch_op.drop_constraint(f"uq_{table}_name", type_="unique")
            except Exception:
                # Constraint already absent (e.g. fresh dev DB) — nothing to do.
                pass


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table("users") as batch_op:
        batch_op.create_unique_constraint("uq_users_name", ["name"])
    with op.batch_alter_table("categories") as batch_op:
        batch_op.create_unique_constraint("uq_categories_name", ["name"])

    for table in SCOPED_TABLES:
        with op.batch_alter_table(table) as batch_op:
            batch_op.drop_constraint(f"fk_{table}_account_id", type_="foreignkey")
            batch_op.drop_column("account_id")

    op.drop_index(op.f("ix_accounts_id"), table_name="accounts")
    op.drop_table("accounts")
