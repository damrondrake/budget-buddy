"""Financial Health Score tests.

All requests pin ?month=6&year=2026 so results are deterministic regardless of
the real calendar date (the previous-3-months trend window is then empty).
"""

PARAMS = {"month": 6, "year": 2026}


def _score(client, auth):
    res = client.get("/api/health-score", headers=auth.headers, params=PARAMS)
    assert res.status_code == 200, res.text
    return res.json()


def _by_key(body):
    return {c["key"]: c for c in body["components"]}


def _both_users(client, auth):
    rows = client.get("/api/users", headers=auth.headers).json()
    return rows[0], rows[1]


def _add_income(client, auth, amount):
    client.post("/api/income", headers=auth.headers, json={
        "user_id": auth.user_id, "amount": amount, "source": "Pay", "month": 6, "year": 2026,
    })


def _add_txn(client, auth, amount, is_split=False, paid_by=None, date="2026-06-10"):
    client.post("/api/transactions", headers=auth.headers, json={
        "amount": amount, "category_id": auth.category_id,
        "paid_by": paid_by or auth.user_id, "is_split": is_split, "date": date,
    })


def test_empty_account_baseline(client, auth):
    body = _score(client, auth)
    # No income(0) + no budgets(20) + no history(20) + no goals(0) + settled(20) = 60.
    assert body["score"] == 60
    assert body["grade"] == "D"
    comps = _by_key(body)
    assert comps["savings_rate"]["score"] == 0.0
    assert comps["budget_adherence"]["score"] == 20.0
    assert comps["spending_trend"]["score"] == 20.0
    assert comps["goal_progress"]["score"] == 0.0
    assert comps["settle_up"]["score"] == 20.0
    assert len(body["components"]) == 5


def test_savings_rate_scales(client, auth):
    _add_income(client, auth, 1000.0)
    _add_txn(client, auth, 900.0)  # saved 10% -> 10 pts
    comps = _by_key(_score(client, auth))
    assert comps["savings_rate"]["score"] == 10.0


def test_savings_rate_caps_at_20(client, auth):
    _add_income(client, auth, 1000.0)
    _add_txn(client, auth, 100.0)  # saved 90% -> capped at 20
    comps = _by_key(_score(client, auth))
    assert comps["savings_rate"]["score"] == 20.0


def test_budget_adherence_over_limit(client, auth):
    # Budget the default category at 100, then spend 150 → over → 0 pts.
    client.post("/api/budgets", headers=auth.headers, json={
        "category_id": auth.category_id, "month": 6, "year": 2026, "amount_limit": 100.0,
    })
    _add_txn(client, auth, 150.0)
    comps = _by_key(_score(client, auth))
    assert comps["budget_adherence"]["score"] == 0.0


def test_budget_adherence_on_track(client, auth):
    client.post("/api/budgets", headers=auth.headers, json={
        "category_id": auth.category_id, "month": 6, "year": 2026, "amount_limit": 100.0,
    })
    _add_txn(client, auth, 50.0)
    comps = _by_key(_score(client, auth))
    assert comps["budget_adherence"]["score"] == 20.0


def test_goal_progress_states(client, auth):
    u1, _ = _both_users(client, auth)
    # No goals → 0.
    assert _by_key(_score(client, auth))["goal_progress"]["score"] == 0.0

    goal = client.post("/api/shared-goals", headers=auth.headers, json={
        "name": "Trip", "target_amount": 500.0, "color": "#22C55E",
    }).json()
    # Goal but no contribution this month → 10.
    assert _by_key(_score(client, auth))["goal_progress"]["score"] == 10.0

    client.post(f"/api/shared-goals/{goal['id']}/contribute", headers=auth.headers, json={
        "user_id": u1["id"], "amount": 50.0, "date": "2026-06-12",
    })
    # Contributed this month → 20.
    assert _by_key(_score(client, auth))["goal_progress"]["score"] == 20.0


def test_settle_up_outstanding_balance(client, auth):
    u1, _ = _both_users(client, auth)
    _add_txn(client, auth, 200.0, is_split=True, paid_by=u1["id"])  # partner owes $100
    comps = _by_key(_score(client, auth))
    assert comps["settle_up"]["score"] == 0.0  # > $50


def test_tip_targets_lowest_component(client, auth):
    # Fresh account: savings_rate and goal_progress both 0. Tip should be one of
    # those two (min picks the first in canonical order → savings_rate).
    body = _score(client, auth)
    assert body["tip"].startswith("Tip:")
    assert "income" in body["tip"].lower() or "goal" in body["tip"].lower()


def test_grade_f_when_low(client, auth):
    # Income with all of it spent (0% saved) keeps savings at 0 and, with no
    # goals, drags the score under 60 → F is reachable; assert grade mapping.
    u1, _ = _both_users(client, auth)
    _add_income(client, auth, 1000.0)
    _add_txn(client, auth, 1000.0, is_split=True, paid_by=u1["id"])  # 0% saved + $500 owed
    body = _score(client, auth)
    # savings 0 + budgets 20 + trend 20 + goals 0 + settle 0 = 40 → F
    assert body["score"] == 40
    assert body["grade"] == "F"


def test_history_returns_points(client, auth):
    res = client.get("/api/health-score/history", headers=auth.headers, params={"months": 6})
    assert res.status_code == 200
    points = res.json()["points"]
    assert len(points) == 6
    assert all("score" in p and "grade" in p and "label" in p for p in points)


def test_health_score_requires_auth(client):
    assert client.get("/api/health-score").status_code == 401
