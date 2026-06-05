"""Shared Financial Goals endpoint tests.

A fresh account has two person-slots (the registrant + an auto-created
"Partner"), which is the couples case these goals are built for.
"""


def _both_users(client, auth):
    rows = client.get("/api/users", headers=auth.headers).json()
    assert len(rows) >= 2
    return rows[0], rows[1]


def _create_goal(client, auth, **overrides):
    payload = {
        "name": "House Down Payment",
        "description": "Save for a place",
        "target_amount": 1000.0,
        "target_date": "2026-12-31",
        "color": "#6366F1",
    }
    payload.update(overrides)
    return client.post("/api/shared-goals", headers=auth.headers, json=payload)


def test_create_and_list_goal(client, auth):
    res = _create_goal(client, auth)
    assert res.status_code == 201, res.text
    body = res.json()
    assert body["name"] == "House Down Payment"
    assert body["total_contributed"] == 0.0
    assert body["remaining"] == 1000.0
    assert body["percent_complete"] == 0.0
    assert body["is_complete"] is False
    # Both partners appear in the breakdown, at $0.
    assert len(body["by_user"]) == 2
    assert all(u["amount"] == 0.0 for u in body["by_user"])


def test_contributions_update_progress_and_breakdown(client, auth):
    u1, u2 = _both_users(client, auth)
    goal_id = _create_goal(client, auth, target_amount=500.0).json()["id"]

    client.post(
        f"/api/shared-goals/{goal_id}/contribute",
        headers=auth.headers,
        json={"user_id": u1["id"], "amount": 250.0, "date": "2026-06-10"},
    )
    client.post(
        f"/api/shared-goals/{goal_id}/contribute",
        headers=auth.headers,
        json={"user_id": u2["id"], "amount": 180.0, "note": "bonus", "date": "2026-06-12"},
    )

    goal = next(g for g in client.get("/api/shared-goals", headers=auth.headers).json() if g["id"] == goal_id)
    assert goal["total_contributed"] == 430.0
    assert goal["remaining"] == 70.0
    assert goal["percent_complete"] == 86.0
    assert goal["is_complete"] is False

    by_user = {u["user_id"]: u["amount"] for u in goal["by_user"]}
    assert by_user[u1["id"]] == 250.0
    assert by_user[u2["id"]] == 180.0


def test_goal_completes_at_target(client, auth):
    u1, _ = _both_users(client, auth)
    goal_id = _create_goal(client, auth, target_amount=100.0).json()["id"]
    client.post(
        f"/api/shared-goals/{goal_id}/contribute",
        headers=auth.headers,
        json={"user_id": u1["id"], "amount": 100.0, "date": "2026-06-10"},
    )
    goal = client.get("/api/shared-goals", headers=auth.headers).json()[0]
    assert goal["is_complete"] is True
    assert goal["percent_complete"] == 100.0
    assert goal["remaining"] == 0.0


def test_update_goal(client, auth):
    goal_id = _create_goal(client, auth).json()["id"]
    res = client.put(
        f"/api/shared-goals/{goal_id}",
        headers=auth.headers,
        json={
            "name": "Vacation",
            "description": None,
            "target_amount": 2000.0,
            "target_date": None,
            "color": "#EC4899",
        },
    )
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["name"] == "Vacation"
    assert body["target_amount"] == 2000.0
    assert body["target_date"] is None


def test_contribution_history_and_delete(client, auth):
    u1, u2 = _both_users(client, auth)
    goal_id = _create_goal(client, auth).json()["id"]
    c1 = client.post(
        f"/api/shared-goals/{goal_id}/contribute",
        headers=auth.headers,
        json={"user_id": u1["id"], "amount": 50.0, "date": "2026-06-10"},
    ).json()
    client.post(
        f"/api/shared-goals/{goal_id}/contribute",
        headers=auth.headers,
        json={"user_id": u2["id"], "amount": 75.0, "date": "2026-06-15"},
    )

    history = client.get(f"/api/shared-goals/{goal_id}/contributions", headers=auth.headers).json()
    assert len(history) == 2
    # Newest first.
    assert history[0]["date"] == "2026-06-15"
    assert history[0]["user_name"] == u2["name"]

    # Delete one contribution → total drops.
    assert client.delete(
        f"/api/shared-goals/{goal_id}/contributions/{c1['id']}", headers=auth.headers
    ).status_code == 204
    goal = client.get("/api/shared-goals", headers=auth.headers).json()[0]
    assert goal["total_contributed"] == 75.0


def test_delete_goal_removes_contributions(client, auth):
    u1, _ = _both_users(client, auth)
    goal_id = _create_goal(client, auth).json()["id"]
    client.post(
        f"/api/shared-goals/{goal_id}/contribute",
        headers=auth.headers,
        json={"user_id": u1["id"], "amount": 50.0, "date": "2026-06-10"},
    )
    assert client.delete(f"/api/shared-goals/{goal_id}", headers=auth.headers).status_code == 204
    assert client.get("/api/shared-goals", headers=auth.headers).json() == []
    # Contributions are gone with the goal.
    assert client.get(f"/api/shared-goals/{goal_id}/contributions", headers=auth.headers).status_code == 404


def test_contribute_rejects_unknown_user(client, auth):
    goal_id = _create_goal(client, auth).json()["id"]
    res = client.post(
        f"/api/shared-goals/{goal_id}/contribute",
        headers=auth.headers,
        json={"user_id": 99999, "amount": 50.0, "date": "2026-06-10"},
    )
    assert res.status_code == 404


def test_shared_goals_require_auth(client):
    assert client.get("/api/shared-goals").status_code == 401


def test_goal_not_found(client, auth):
    assert client.get("/api/shared-goals/99999/contributions", headers=auth.headers).status_code == 404
