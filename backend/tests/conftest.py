"""Shared pytest fixtures.

Each test gets a fresh in-memory SQLite database (all tables created) and a
TestClient whose `get_db` dependency is pointed at that database. The `auth`
fixture registers and authenticates a brand-new account so tests start from a
clean, isolated state.
"""
import os

# Must be set before importing app modules: auth.py reads SECRET_KEY at import
# time, and database.py builds its engine from DATABASE_URL.
os.environ.setdefault("SECRET_KEY", "test-secret-key")
os.environ.setdefault("DATABASE_URL", "sqlite://")

from types import SimpleNamespace  # noqa: E402

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402

import app.models  # noqa: F401,E402  -- registers every model on Base.metadata
from app.database import Base, get_db  # noqa: E402
from app.main import app  # noqa: E402
from app.security import limiter  # noqa: E402

# Rate limiting would 429 tests that hit /login repeatedly (e.g. wrong-password).
limiter.enabled = False


@pytest.fixture()
def db_engine():
    """A fresh in-memory SQLite DB per test (shared across connections)."""
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


@pytest.fixture()
def client(db_engine):
    """TestClient backed by the per-test database."""
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=db_engine)

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture()
def register_account(client):
    """Factory: register + authenticate an account, returning a handy namespace.

    The namespace carries the auth headers plus the account's first default
    category id and user (person) id, which most data endpoints need.
    """
    def _register(email="user@example.com", password="password123", display_name="Tester"):
        res = client.post(
            "/api/auth/register",
            json={"email": email, "password": password, "display_name": display_name},
        )
        assert res.status_code == 201, res.text
        token = res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        category_id = client.get("/api/categories", headers=headers).json()[0]["id"]
        user_id = client.get("/api/users", headers=headers).json()[0]["id"]
        return SimpleNamespace(
            headers=headers,
            email=email,
            password=password,
            token=token,
            category_id=category_id,
            user_id=user_id,
        )

    return _register


@pytest.fixture()
def auth(register_account):
    """A single registered + authenticated account for the common case."""
    return register_account()
