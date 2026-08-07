"""Partner-invite acceptance flow.

Covers inviting a partner and both ways of accepting: registering a brand-new
account, and signing in with an existing one. Includes the validation cases that
a real user hit — most importantly a too-short password on the register path,
which must return a clean 422 (the frontend now renders its `msg` instead of
crashing on the raw error array).
"""


def _invite(client, auth, email="partner@example.com"):
    """Owner (``auth``) invites ``email``; return the single-use invite token."""
    res = client.post("/api/auth/invite", json={"email": email}, headers=auth.headers)
    assert res.status_code == 200, res.text
    token = res.json()["debug_token"]
    assert token
    return token


def test_invite_returns_debug_token(client, auth):
    token = _invite(client, auth)
    assert isinstance(token, str) and len(token) > 10


def test_accept_invite_register_creates_member(client, auth):
    token = _invite(client, auth, email="newpartner@example.com")

    res = client.post(
        "/api/auth/accept-invite/register",
        json={
            "token": token,
            "email": "newpartner@example.com",
            "password": "password123",
            "display_name": "New Partner",
        },
    )
    assert res.status_code == 201, res.text
    assert res.json()["access_token"]

    # The owner's account now reports itself as shared with one member.
    me = client.get("/api/auth/me", headers=auth.headers).json()
    assert me["is_shared"] is True
    assert me["member_count"] == 2


def test_accept_invite_register_short_password_returns_422(client, auth):
    """The exact bug: a <8 char password on the invite register path.

    The frontend used to allow 6-char passwords, so a real user submitted one
    and the backend rejected it. This must be a 422 whose `detail` is the list
    of Pydantic error objects (each with a `msg` the client can display) — NOT
    a 500, and not something that leaks past validation.
    """
    token = _invite(client, auth, email="gf@example.com")

    res = client.post(
        "/api/auth/accept-invite/register",
        json={
            "token": token,
            "email": "gf@example.com",
            "password": "abc123",  # 6 chars — under the 8-char minimum
            "display_name": "Girlfriend",
        },
    )
    assert res.status_code == 422, res.text

    detail = res.json()["detail"]
    assert isinstance(detail, list)
    # Every entry carries a human-readable `msg` (what the UI now surfaces).
    assert all("msg" in item for item in detail)
    assert any(item["loc"][-1] == "password" for item in detail)

    # A password meeting the minimum on the same token then succeeds.
    ok = client.post(
        "/api/auth/accept-invite/register",
        json={
            "token": token,
            "email": "gf@example.com",
            "password": "abcd1234",
            "display_name": "Girlfriend",
        },
    )
    assert ok.status_code == 201, ok.text


def test_accept_invite_register_short_display_name_returns_422(client, auth):
    token = _invite(client, auth, email="p2@example.com")
    res = client.post(
        "/api/auth/accept-invite/register",
        json={
            "token": token,
            "email": "p2@example.com",
            "password": "password123",
            "display_name": "A",  # under the 2-char minimum
        },
    )
    assert res.status_code == 422, res.text


def test_accept_invite_register_existing_email_conflicts(client, auth, register_account):
    existing = register_account(email="taken@example.com")
    token = _invite(client, auth, email=existing.email)

    res = client.post(
        "/api/auth/accept-invite/register",
        json={
            "token": token,
            "email": existing.email,
            "password": "password123",
            "display_name": "Taken",
        },
    )
    assert res.status_code == 409, res.text


def test_accept_invite_register_invalid_token_rejected(client):
    res = client.post(
        "/api/auth/accept-invite/register",
        json={
            "token": "not-a-real-token",
            "email": "someone@example.com",
            "password": "password123",
            "display_name": "Someone",
        },
    )
    assert res.status_code == 400, res.text


def test_accept_invite_login_with_existing_account(client, auth, register_account):
    partner = register_account(email="existing@example.com", password="password123")
    token = _invite(client, auth, email=partner.email)

    res = client.post(
        "/api/auth/accept-invite/login",
        json={"token": token, "email": partner.email, "password": "password123"},
    )
    assert res.status_code == 200, res.text
    assert res.json()["access_token"]

    me = client.get("/api/auth/me", headers=auth.headers).json()
    assert me["member_count"] == 2


def test_accept_invite_login_wrong_password_unauthorized(client, auth, register_account):
    partner = register_account(email="wrongpw@example.com", password="password123")
    token = _invite(client, auth, email=partner.email)

    res = client.post(
        "/api/auth/accept-invite/login",
        json={"token": token, "email": partner.email, "password": "not-the-password"},
    )
    assert res.status_code == 401, res.text


def test_invite_token_is_single_use(client, auth):
    token = _invite(client, auth, email="oneshot@example.com")
    first = client.post(
        "/api/auth/accept-invite/register",
        json={
            "token": token,
            "email": "oneshot@example.com",
            "password": "password123",
            "display_name": "One Shot",
        },
    )
    assert first.status_code == 201, first.text

    # Reusing the now-consumed token fails.
    second = client.post(
        "/api/auth/accept-invite/register",
        json={
            "token": token,
            "email": "another@example.com",
            "password": "password123",
            "display_name": "Another",
        },
    )
    assert second.status_code == 400, second.text
