"""Comprehensive auth failure-path tests.

Covers rate limiting, account-enumeration resistance, token security, input
validation, password-reset security, and malicious-input edge cases.

Rate limiting is disabled globally in conftest (so other tests don't 429). The
`rate_limiting()` context manager below re-enables it and resets the limiter's
in-memory counters before and after, so each rate-limit test is isolated.
"""
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone

from jose import jwt
from sqlalchemy.orm import Session

from app.auth import SECRET_KEY, ALGORITHM
from app.models.account import Account
from app.security import limiter

PROTECTED_ENDPOINT = "/api/auth/me"
GENERIC_RESET_MESSAGE = "If an account exists for that email, a reset link has been sent."
GENERIC_LOGIN_ERROR = "Invalid email or password"


@contextmanager
def rate_limiting():
    """Enable rate limiting with fresh counters, then restore the disabled state."""
    limiter.reset()
    limiter.enabled = True
    try:
        yield
    finally:
        limiter.enabled = False
        limiter.reset()


def _expired_token(account_id: int = 1) -> str:
    """A validly-signed JWT whose exp is in the past."""
    payload = {"sub": str(account_id), "exp": datetime.now(timezone.utc) - timedelta(minutes=5)}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


# ---------------------------------------------------------------------------
# Rate limiting (5 / minute per IP)
# ---------------------------------------------------------------------------

def test_login_rate_limited_after_five_attempts(client, auth):
    with rate_limiting():
        codes = [
            client.post("/api/auth/login", json={"email": auth.email, "password": "wrongpass1"}).status_code
            for _ in range(6)
        ]
    assert codes[:5] == [401, 401, 401, 401, 401]
    assert codes[5] == 429


def test_register_rate_limited_after_five_attempts(client):
    with rate_limiting():
        codes = [
            client.post(
                "/api/auth/register",
                json={"email": f"reg{i}@example.com", "password": "password123", "display_name": "User"},
            ).status_code
            for i in range(6)
        ]
    assert codes[:5] == [201, 201, 201, 201, 201]
    assert codes[5] == 429


def test_forgot_password_rate_limited_after_five_attempts(client, auth):
    with rate_limiting():
        codes = [
            client.post("/api/auth/forgot-password", json={"email": auth.email}).status_code
            for _ in range(6)
        ]
    assert codes[:5] == [200, 200, 200, 200, 200]
    assert codes[5] == 429


# ---------------------------------------------------------------------------
# Account enumeration prevention
# ---------------------------------------------------------------------------

def test_forgot_password_hides_whether_email_exists(client, auth):
    real = client.post("/api/auth/forgot-password", json={"email": auth.email})
    fake = client.post("/api/auth/forgot-password", json={"email": "ghost@example.com"})
    assert real.status_code == 200 and fake.status_code == 200
    # Identical generic message — the response must not reveal account existence.
    assert real.json()["message"] == fake.json()["message"] == GENERIC_RESET_MESSAGE


def test_login_unknown_email_matches_wrong_password(client, auth):
    unknown = client.post("/api/auth/login", json={"email": "ghost@example.com", "password": "password123"})
    wrong_pw = client.post("/api/auth/login", json={"email": auth.email, "password": "wrongpass1"})
    # Never 404 — both return the same 401 + identical message.
    assert unknown.status_code == 401 and wrong_pw.status_code == 401
    assert unknown.json()["detail"] == wrong_pw.json()["detail"] == GENERIC_LOGIN_ERROR


# ---------------------------------------------------------------------------
# Token security
# ---------------------------------------------------------------------------

def test_protected_endpoint_without_token_is_401(client):
    assert client.get(PROTECTED_ENDPOINT).status_code == 401


def test_protected_endpoint_with_malformed_token_is_401(client):
    res = client.get(PROTECTED_ENDPOINT, headers={"Authorization": "Bearer not.a.real.jwt"})
    assert res.status_code == 401


def test_protected_endpoint_with_expired_token_is_401(client):
    res = client.get(PROTECTED_ENDPOINT, headers={"Authorization": f"Bearer {_expired_token()}"})
    assert res.status_code == 401


def test_protected_endpoint_with_deleted_account_token_is_401(client, register_account):
    a = register_account("temp@example.com")
    # The token is valid, but the account it points at no longer exists.
    assert client.delete("/api/auth/account", headers=a.headers).status_code == 200
    assert client.get(PROTECTED_ENDPOINT, headers=a.headers).status_code == 401


# ---------------------------------------------------------------------------
# Registration input validation (422 before touching the DB)
# ---------------------------------------------------------------------------

def _register(client, **overrides):
    body = {"email": "valid@example.com", "password": "password123", "display_name": "Valid"}
    body.update(overrides)
    return client.post("/api/auth/register", json=body)


def test_register_short_password_is_422(client):
    assert _register(client, password="short").status_code == 422


def test_register_empty_password_is_422(client):
    assert _register(client, password="").status_code == 422


def test_register_empty_email_is_422(client):
    assert _register(client, email="").status_code == 422


def test_register_invalid_email_format_is_422(client):
    assert _register(client, email="not-an-email").status_code == 422


def test_register_short_display_name_is_422(client):
    assert _register(client, display_name="A").status_code == 422


# ---------------------------------------------------------------------------
# Password-reset token security
# ---------------------------------------------------------------------------

def test_reset_token_is_single_use(client, auth):
    token = client.post("/api/auth/forgot-password", json={"email": auth.email}).json()["debug_token"]
    assert token
    first = client.post("/api/auth/reset-password", json={"token": token, "password": "newpassword1"})
    assert first.status_code == 200
    # Reusing the now-consumed token must fail.
    second = client.post("/api/auth/reset-password", json={"token": token, "password": "another1234"})
    assert second.status_code == 400


def test_expired_reset_token_is_rejected(client, auth, db_engine):
    with Session(db_engine) as s:
        acct = s.query(Account).filter(Account.email == auth.email).first()
        acct.reset_token = "expired-token-abc"
        # Naive UTC, matching how the app stores reset_token_expires.
        acct.reset_token_expires = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(hours=2)
        s.commit()
    res = client.post("/api/auth/reset-password", json={"token": "expired-token-abc", "password": "newpassword1"})
    assert res.status_code == 400


def test_fake_reset_token_is_rejected(client):
    res = client.post("/api/auth/reset-password", json={"token": "totally-fake-token", "password": "newpassword1"})
    assert res.status_code == 400


# ---------------------------------------------------------------------------
# Malicious-input edge cases
# ---------------------------------------------------------------------------

def test_login_sql_injection_in_email_is_clean_401(client):
    # A SQL-injection payload that is still a valid email format. The ORM treats
    # it as a literal value, so it finds no account and returns 401 — never 500.
    res = client.post("/api/auth/login", json={"email": "x'OR'1'='1@example.com", "password": "whatever12"})
    assert res.status_code == 401


def test_register_xss_in_display_name_is_stored_as_plain_text(client):
    xss = "<script>alert(1)</script>"
    reg = _register(client, email="xss@example.com", display_name=xss)
    assert reg.status_code == 201
    token = reg.json()["access_token"]
    me = client.get(PROTECTED_ENDPOINT, headers={"Authorization": f"Bearer {token}"}).json()
    # Returned verbatim as a JSON string value — inert plain text, not executed.
    assert me["display_name"] == xss


def test_register_extremely_long_email_is_422(client):
    long_email = "a" * 490 + "@example.com"  # ~502 chars, well over the 254 limit
    res = _register(client, email=long_email)
    assert res.status_code == 422
