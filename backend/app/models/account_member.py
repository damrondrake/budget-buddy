from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class AccountMember(Base):
    """Maps a person (by email) to a shared account they collaborate on.

    The account owner is implicit (the Account row itself); rows here represent
    additional people invited to share that account. Data scoping resolves a
    member's effective account_id to this account_id, so they see the same
    transactions, budgets, income, and savings.
    """

    __tablename__ = "account_members"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    account_id: Mapped[int] = mapped_column(
        ForeignKey("accounts.id"), nullable=False, index=True
    )
    user_email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    role: Mapped[str] = mapped_column(String(20), nullable=False, default="member")
    joined_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )
