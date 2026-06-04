from sqlalchemy import Boolean, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class RecurringTransaction(Base):
    __tablename__ = "recurring_transactions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    category_id: Mapped[int] = mapped_column(ForeignKey("categories.id"), nullable=False)
    paid_by: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    is_split: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    day_of_month: Mapped[int] = mapped_column(Integer, nullable=False)
    note: Mapped[str] = mapped_column(String(255), nullable=False)
    # 'weekly' | 'monthly' | 'yearly'.
    frequency: Mapped[str] = mapped_column(
        String(10), nullable=False, default="monthly", server_default="monthly"
    )
    # Anchor month (1-12) for yearly rules so they only fire in the right month.
    month_of_year: Mapped[int | None] = mapped_column(Integer, nullable=True)
    account_id: Mapped[int] = mapped_column(ForeignKey("accounts.id"), nullable=False)

    category: Mapped["Category"] = relationship()
    paid_by_user: Mapped["User"] = relationship()
