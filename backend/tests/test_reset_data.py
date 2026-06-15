"""Tests for the DELETE /api/users/reset-data clean-slate endpoint.

Resetting must wipe every financial table scoped to the account while leaving
the account, its users, and custom categories untouched.
"""


def _seed_account_with_data(client, auth):
    """Create one row in each data table this endpoint should wipe."""
    users = client.get("/api/users", headers=auth.headers).json()
    u1, u2 = users[0]["id"], users[1]["id"]

    # Transaction
    client.post(
        "/api/transactions",
        headers=auth.headers,
        json={"amount": 50.0, "category_id": auth.category_id, "paid_by": u1, "date": "2026-06-10"},
    )
    # Recurring template
    client.post(
        "/api/recurring",
        headers=auth.headers,
        json={
            "amount": 12.0,
            "category_id": auth.category_id,
            "paid_by": u1,
            "day_of_month": 1,
            "note": "Subscription",
        },
    )
    # Budget (+ line item)
    budget_id = client.post(
        "/api/budgets",
        headers=auth.headers,
        json={"category_id": auth.category_id, "month": 6, "year": 2026, "amount_limit": 500.0},
    ).json()["id"]
    client.post(
        f"/api/budgets/{budget_id}/items",
        headers=auth.headers,
        json={"label": "Groceries", "amount": 100.0},
    )
    # Income
    client.post(
        "/api/income",
        headers=auth.headers,
        json={"user_id": u1, "amount": 3000.0, "source": "Job", "month": 6, "year": 2026},
    )
    # Savings goal (+ transaction)
    goal_id = client.post(
        "/api/savings",
        headers=auth.headers,
        json={"name": "Vacation", "color": "#6366F1"},
    ).json()["id"]
    client.post(
        f"/api/savings/{goal_id}/transactions",
        headers=auth.headers,
        json={"amount": 25.0, "type": "deposit", "date": "2026-06-10"},
    )
    # Shared goal (+ contribution)
    shared_id = client.post(
        "/api/shared-goals",
        headers=auth.headers,
        json={"name": "House", "target_amount": 1000.0, "color": "#10B981"},
    ).json()["id"]
    client.post(
        f"/api/shared-goals/{shared_id}/contribute",
        headers=auth.headers,
        json={"user_id": u1, "amount": 100.0, "date": "2026-06-10"},
    )
    # Settlement
    client.post(
        "/api/settlements",
        headers=auth.headers,
        json={"paid_by": u1, "paid_to": u2, "amount": 40.0, "date": "2026-06-10"},
    )


def test_reset_data_wipes_everything_and_keeps_account(client, auth):
    _seed_account_with_data(client, auth)

    res = client.delete("/api/users/reset-data", headers=auth.headers)
    assert res.status_code == 200, res.text
    assert res.json() == {"success": True, "message": "All data has been reset."}

    # Every data table is now empty for this account.
    assert client.get("/api/transactions", headers=auth.headers, params={"month": 6, "year": 2026}).json() == []
    assert client.get("/api/recurring", headers=auth.headers).json() == []
    assert client.get("/api/budgets", headers=auth.headers, params={"month": 6, "year": 2026}).json() == []
    assert client.get("/api/income", headers=auth.headers, params={"month": 6, "year": 2026}).json() == []
    assert client.get("/api/savings", headers=auth.headers).json() == []
    assert client.get("/api/shared-goals", headers=auth.headers).json() == []
    assert client.get("/api/settlements", headers=auth.headers, params={"month": 6, "year": 2026}).json() == []

    # Account-level setup is preserved.
    assert client.get("/api/auth/me", headers=auth.headers).status_code == 200
    assert len(client.get("/api/users", headers=auth.headers).json()) >= 1
    assert len(client.get("/api/categories", headers=auth.headers).json()) > 0


def test_reset_data_requires_auth(client):
    assert client.delete("/api/users/reset-data").status_code == 401


def test_reset_data_only_touches_callers_account(client, register_account):
    a = register_account("a@example.com")
    b = register_account("b@example.com")
    _seed_account_with_data(client, b)

    # Account A resets — B's data must be untouched.
    client.delete("/api/users/reset-data", headers=a.headers)

    assert len(client.get("/api/shared-goals", headers=b.headers).json()) == 1
    assert len(client.get("/api/settlements", headers=b.headers, params={"month": 6, "year": 2026}).json()) == 1
