from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(50), nullable=False, unique=True)

    transactions: Mapped[list["Transaction"]] = relationship(back_populates="paid_by_user")
    incomes: Mapped[list["Income"]] = relationship(back_populates="user")
