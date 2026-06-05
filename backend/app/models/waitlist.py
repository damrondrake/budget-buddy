from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class WaitlistEntry(Base):
    """An email signup for the upcoming BudgetBuddy Pro launch.

    Captured from the Billing page's "Coming Soon" flow. ``account_id`` is the
    account the signup came from (nullable so the table can also accept signups
    from non-authenticated contexts later).
    """

    __tablename__ = "waitlist"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    account_id: Mapped[int | None] = mapped_column(
        ForeignKey("accounts.id"), nullable=True, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )
