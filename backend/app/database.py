import os

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

# override=False so platform-injected env vars (Railway) always win over any .env file.
load_dotenv(override=False)

SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./budget_buddy.db")

# Railway/Heroku style postgres:// URLs need to be normalized for SQLAlchemy 2.x.
if SQLALCHEMY_DATABASE_URL.startswith("postgres://"):
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace(
        "postgres://", "postgresql://", 1
    )

engine_kwargs = {}
if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    engine_kwargs["connect_args"] = {"check_same_thread": False}
else:
    # Hosted Postgres (Neon) drops idle server-side connections — with Neon's
    # scale-to-zero this happens after a few minutes idle. Without guarding for
    # it, SQLAlchemy hands out a stale pooled connection and the next query dies
    # with "SSL connection has been closed unexpectedly".
    #
    # pool_pre_ping: emit a lightweight liveness check before using any pooled
    #   connection; if it's dead, SQLAlchemy transparently discards and reopens
    #   it. This is the real fix and works on both the direct and pooled Neon
    #   endpoints.
    # pool_recycle: proactively retire connections older than this (seconds),
    #   staying under Neon's idle cutoff so we rarely even reach a dropped one.
    engine_kwargs["pool_pre_ping"] = True
    engine_kwargs["pool_recycle"] = 300

engine = create_engine(SQLALCHEMY_DATABASE_URL, **engine_kwargs)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
