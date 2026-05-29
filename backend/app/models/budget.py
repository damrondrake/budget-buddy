from sqlalchemy import Boolean, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Budget(Base):
    __tablename__ = "budgets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    category_id: Mapped[int] = mapped_column(ForeignKey("categories.id"), nullable=False)
    month: Mapped[int] = mapped_column(Integer, nullable=False)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    amount_limit: Mapped[float] = mapped_column(Float, nullable=False)
    note: Mapped[str | None] = mapped_column(String(255), nullable=True)
    paid: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, server_default="0")
    account_id: Mapped[int] = mapped_column(ForeignKey("accounts.id"), nullable=False)

    category: Mapped["Category"] = relationship(back_populates="budgets")
    line_items: Mapped[list["BudgetLineItem"]] = relationship(
        back_populates="budget", cascade="all, delete-orphan"
    )
