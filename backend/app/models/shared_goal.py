from datetime import date as date_type, datetime, timezone

from sqlalchemy import Date, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class SharedGoal(Base):
    """A couple-focused financial goal both account members work toward together.

    Distinct from the personal Savings feature: a shared goal tracks contributions
    from each person on the account toward one common target.
    """

    __tablename__ = "shared_goals"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    account_id: Mapped[int] = mapped_column(ForeignKey("accounts.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)
    target_amount: Mapped[float] = mapped_column(Float, nullable=False)
    target_date: Mapped[date_type | None] = mapped_column(Date, nullable=True)
    color: Mapped[str] = mapped_column(String(7), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )

    contributions: Mapped[list["SharedGoalContribution"]] = relationship(
        back_populates="goal", cascade="all, delete-orphan"
    )


class SharedGoalContribution(Base):
    """A single contribution by one person toward a shared goal."""

    __tablename__ = "shared_goal_contributions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    goal_id: Mapped[int] = mapped_column(ForeignKey("shared_goals.id"), nullable=False)
    account_id: Mapped[int] = mapped_column(ForeignKey("accounts.id"), nullable=False)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    note: Mapped[str | None] = mapped_column(String(255), nullable=True)
    date: Mapped[date_type] = mapped_column(Date, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )

    goal: Mapped["SharedGoal"] = relationship(back_populates="contributions")
