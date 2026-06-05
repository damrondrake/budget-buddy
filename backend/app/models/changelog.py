from datetime import date as date_type

from sqlalchemy import JSON, Date, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Changelog(Base):
    """A global "What's New" entry, shown to every account once per version."""

    __tablename__ = "changelogs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    version: Mapped[str] = mapped_column(String(20), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    # JSON array of bullet-point strings describing what changed.
    items: Mapped[list[str]] = mapped_column(JSON, nullable=False)
    released_at: Mapped[date_type] = mapped_column(Date, nullable=False)
