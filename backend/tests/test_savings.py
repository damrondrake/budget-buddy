def _quick_deposit(client, auth, amount, note=None, date=None):
    payload = {"amount": amount, "paid_by": auth.user_id}
    if note is not None:
        payload["note"] = note
    if date is not None:
        payload["date"] = date
    return client.post("/api/savings/quick-deposit", headers=auth.headers, json=payload)


def test_quick_deposit_creates_default_goal(client, auth):
    # No goals to start with.
    assert client.get("/api/savings", headers=auth.headers).json() == []

    res = _quick_deposit(client, auth, 250.0, note="Rainy day")
    assert res.status_code == 201, res.text
    body = res.json()
    assert body["name"] == "Savings"
    assert body["total_saved"] == 250.0

    goals = client.get("/api/savings", headers=auth.headers).json()
    assert len(goals) == 1
    assert goals[0]["total_saved"] == 250.0


def test_quick_deposit_reuses_default_goal(client, auth):
    _quick_deposit(client, auth, 100.0)
    _quick_deposit(client, auth, 150.0)

    goals = client.get("/api/savings", headers=auth.headers).json()
    # Both deposits land in the same auto-created "Savings" goal.
    assert len(goals) == 1
    assert goals[0]["total_saved"] == 250.0


def test_quick_deposit_records_real_transaction_and_reduces_balance(client, auth):
    client.post("/api/income", headers=auth.headers,
                json={"user_id": auth.user_id, "amount": 1000.0, "source": "Pay", "month": 6, "year": 2026})

    _quick_deposit(client, auth, 200.0)

    cumulative = client.get("/api/cumulative", headers=auth.headers).json()
    # The deposit is a real Savings transaction, so it reduces net_balance...
    assert cumulative["net_balance"] == 800.0
    # ...and shows up as money set aside.
    assert cumulative["total_saved"] == 200.0


def test_quick_deposit_requires_valid_amount(client, auth):
    res = _quick_deposit(client, auth, 0.0)
    assert res.status_code == 422
