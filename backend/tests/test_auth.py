def test_register_returns_token(client):
    res = client.post(
        "/api/auth/register",
        json={"email": "new@example.com", "password": "password123", "display_name": "New"},
    )
    assert res.status_code == 201
    assert res.json()["access_token"]


def test_register_seeds_default_categories_and_users(auth, client):
    cats = client.get("/api/categories", headers=auth.headers).json()
    users = client.get("/api/users", headers=auth.headers).json()
    assert len(cats) > 0
    assert len(users) == 2  # owner + "Partner"


def test_register_duplicate_email_conflicts(client, auth):
    res = client.post(
        "/api/auth/register",
        json={"email": auth.email, "password": "password123", "display_name": "Dupe"},
    )
    assert res.status_code == 409


def test_register_rejects_short_display_name(client):
    res = client.post(
        "/api/auth/register",
        json={"email": "x@example.com", "password": "password123", "display_name": "A"},
    )
    assert res.status_code == 422


def test_login_succeeds_with_correct_password(client, auth):
    res = client.post("/api/auth/login", json={"email": auth.email, "password": auth.password})
    assert res.status_code == 200
    assert res.json()["access_token"]


def test_login_wrong_password_unauthorized(client, auth):
    res = client.post("/api/auth/login", json={"email": auth.email, "password": "wrongpass1"})
    assert res.status_code == 401


def test_login_unknown_email_unauthorized(client):
    res = client.post("/api/auth/login", json={"email": "ghost@example.com", "password": "password123"})
    assert res.status_code == 401


def test_me_requires_auth(client):
    assert client.get("/api/auth/me").status_code == 401


def test_forgot_and_reset_password_flow(client, auth):
    # Forgot returns a debug token because no email provider is configured in tests.
    forgot = client.post("/api/auth/forgot-password", json={"email": auth.email})
    assert forgot.status_code == 200
    token = forgot.json()["debug_token"]
    assert token

    # Reset with the token.
    reset = client.post(
        "/api/auth/reset-password",
        json={"token": token, "password": "newpassword1"},
    )
    assert reset.status_code == 200

    # Old password no longer works; new one does.
    assert client.post("/api/auth/login", json={"email": auth.email, "password": auth.password}).status_code == 401
    assert client.post("/api/auth/login", json={"email": auth.email, "password": "newpassword1"}).status_code == 200


def test_forgot_password_unknown_email_is_generic(client):
    # Must not reveal whether the email exists.
    res = client.post("/api/auth/forgot-password", json={"email": "nobody@example.com"})
    assert res.status_code == 200


def test_reset_password_invalid_token_rejected(client):
    res = client.post(
        "/api/auth/reset-password",
        json={"token": "not-a-real-token", "password": "newpassword1"},
    )
    assert res.status_code == 400
