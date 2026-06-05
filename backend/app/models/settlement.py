from datetime import date as date_type, datetime, timezone

from sqlalchemy import Date, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Settlement(Base):
    """A settlement payment between two people on a shared account.

    Records that ``paid_by`` gave ``paid_to`` ``amount`` to square up the running
    split balance. Settlements aren't expenses (they never count toward spending);
    they only shift the balance between users back toward zero. ``paid_by`` and
    ``paid_to`` both reference ``users.id``; names are resolved in the router (no
    relationship is declared to avoid ambiguous dual-FK joins to the same table).
    """

    __tablename__ = "settlements"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    account_id: Mapped[int] = mapped_column(ForeignKey("accounts.id"), nullable=False)
    paid_by: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    paid_to: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    note: Mapped[str | None] = mapped_column(String(255), nullable=True)
    date: Mapped[date_type] = mapped_column(Date, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )
