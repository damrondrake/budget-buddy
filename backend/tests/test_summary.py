def _add_income(client, auth, amount, month=6, year=2026):
    return client.post(
        "/api/income",
        headers=auth.headers,
        json={"user_id": auth.user_id, "amount": amount, "source": "Pay", "month": month, "year": year},
    )


def _add_transaction(client, auth, amount, date="2026-06-10"):
    return client.post(
        "/api/transactions",
        headers=auth.headers,
        json={"amount": amount, "category_id": auth.category_id, "paid_by": auth.user_id, "date": date},
    )


def test_summary_returns_correct_totals(client, auth):
    _add_income(client, auth, 2000.0, month=6)
    _add_transaction(client, auth, 50.0, date="2026-06-10")
    _add_transaction(client, auth, 30.0, date="2026-06-12")

    summary = client.get("/api/summary/6/2026", headers=auth.headers).json()
    assert summary["total_income"] == 2000.0
    assert summary["total_spent"] == 80.0
    assert summary["remaining"] == 1920.0


def test_summary_excludes_other_months(client, auth):
    _add_income(client, auth, 2000.0, month=6)
    _add_transaction(client, auth, 50.0, date="2026-06-10")
    # July should be empty.
    summary = client.get("/api/summary/7/2026", headers=auth.headers).json()
    assert summary["total_income"] == 0.0
    assert summary["total_spent"] == 0.0
    assert summary["remaining"] == 0.0


def test_cumulative_returns_correct_totals(client, auth):
    _add_income(client, auth, 2000.0, month=6)
    _add_transaction(client, auth, 50.0, date="2026-06-10")

    cumulative = client.get("/api/cumulative", headers=auth.headers).json()
    assert cumulative["total_income"] == 2000.0
    assert cumulative["total_spending"] == 50.0
    assert cumulative["net_balance"] == 1950.0


def test_cumulative_includes_starting_balance(client, auth):
    client.post("/api/account/starting-balance", headers=auth.headers, json={"amount": 1000.0, "date": "2026-01-01"})
    _add_income(client, auth, 2000.0, month=6)
    _add_transaction(client, auth, 50.0, date="2026-06-10")

    cumulative = client.get("/api/cumulative", headers=auth.headers).json()
    # Starting balance flows into income automatically.
    assert cumulative["total_income"] == 3000.0
    assert cumulative["total_spending"] == 50.0
    assert cumulative["net_balance"] == 2950.0
