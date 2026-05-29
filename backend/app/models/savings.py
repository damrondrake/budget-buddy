from datetime import date as date_type, datetime, timezone

from sqlalchemy import Date, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class SavingsGoal(Base):
    __tablename__ = "savings_goals"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    account_id: Mapped[int] = mapped_column(ForeignKey("accounts.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    color: Mapped[str] = mapped_column(String(7), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )

    allocations: Mapped[list["SavingsAllocation"]] = relationship(
        back_populates="goal", cascade="all, delete-orphan"
    )
    transactions: Mapped[list["SavingsTransaction"]] = relationship(
        back_populates="goal", cascade="all, delete-orphan"
    )


class SavingsAllocation(Base):
    __tablename__ = "savings_allocations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    goal_id: Mapped[int] = mapped_column(ForeignKey("savings_goals.id"), nullable=False)
    account_id: Mapped[int] = mapped_column(ForeignKey("accounts.id"), nullable=False)
    label: Mapped[str] = mapped_column(String(100), nullable=False)
    target_amount: Mapped[float] = mapped_column(Float, nullable=False)

    goal: Mapped["SavingsGoal"] = relationship(back_populates="allocations")


class SavingsTransaction(Base):
    __tablename__ = "savings_transactions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    goal_id: Mapped[int] = mapped_column(ForeignKey("savings_goals.id"), nullable=False)
    allocation_id: Mapped[int | None] = mapped_column(
        ForeignKey("savings_allocations.id"), nullable=True
    )
    account_id: Mapped[int] = mapped_column(ForeignKey("accounts.id"), nullable=False)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    type: Mapped[str] = mapped_column(String(20), nullable=False)  # 'deposit' or 'withdrawal'
    note: Mapped[str | None] = mapped_column(String(255), nullable=True)
    date: Mapped[date_type] = mapped_column(Date, nullable=False)

    goal: Mapped["SavingsGoal"] = relationship(back_populates="transactions")
