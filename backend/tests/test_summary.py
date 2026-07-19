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


def _add_excluded_transaction(client, auth, amount, date="2026-06-10"):
    return client.post(
        "/api/transactions",
        headers=auth.headers,
        json={
            "amount": amount,
            "category_id": auth.category_id,
            "paid_by": auth.user_id,
            "date": date,
            "excluded_from_balance": True,
        },
    )


def test_cumulative_excludes_flagged_transactions(client, auth):
    _add_income(client, auth, 2000.0, month=6)
    _add_transaction(client, auth, 50.0, date="2026-06-10")
    # Paid in real life before tracking — must not hit the cumulative balance.
    _add_excluded_transaction(client, auth, 300.0, date="2026-06-11")

    cumulative = client.get("/api/cumulative", headers=auth.headers).json()
    assert cumulative["total_income"] == 2000.0
    # Only the non-excluded 50 counts against the all-time balance.
    assert cumulative["total_spending"] == 50.0
    assert cumulative["net_balance"] == 1950.0


def test_monthly_summary_still_counts_excluded_transactions(client, auth):
    _add_income(client, auth, 2000.0, month=6)
    _add_transaction(client, auth, 50.0, date="2026-06-10")
    _add_excluded_transaction(client, auth, 300.0, date="2026-06-11")

    # The monthly view keeps counting excluded txns so budget progress/paid stay accurate.
    summary = client.get("/api/summary/6/2026", headers=auth.headers).json()
    assert summary["total_spent"] == 350.0
    by_cat = {c["category_id"]: c for c in summary["by_category"]}
    assert by_cat[auth.category_id]["spent"] == 350.0


def _add_budget(client, auth, amount_limit, month=6, year=2026):
    return client.post(
        "/api/budgets",
        headers=auth.headers,
        json={
            "category_id": auth.category_id,
            "month": month,
            "year": year,
            "amount_limit": amount_limit,
            "note": None,
        },
    )


def test_budget_coverage_on_track(client, auth):
    _add_income(client, auth, 2000.0, month=6)
    _add_budget(client, auth, 500.0)
    _add_transaction(client, auth, 200.0, date="2026-06-10")

    coverage = client.get("/api/summary/6/2026", headers=auth.headers).json()["budget_coverage"]
    # 500 budget - 200 spent = 300 still owed this month.
    assert coverage["remaining_obligations"] == 300.0
    # Available = all-time income (2000) - spending (200) = 1800.
    assert coverage["available_balance"] == 1800.0
    assert coverage["projected_balance"] == 1500.0
    assert coverage["status"] == "on_track"


def test_budget_coverage_short(client, auth):
    _add_income(client, auth, 100.0, month=6)
    _add_budget(client, auth, 500.0)
    _add_transaction(client, auth, 50.0, date="2026-06-10")

    coverage = client.get("/api/summary/6/2026", headers=auth.headers).json()["budget_coverage"]
    # 500 - 50 = 450 remaining obligations; available = 100 - 50 = 50.
    assert coverage["remaining_obligations"] == 450.0
    assert coverage["available_balance"] == 50.0
    assert coverage["projected_balance"] == -400.0
    assert coverage["status"] == "short"


def test_budget_coverage_excluded_txn_still_reduces_obligation(client, auth):
    # An excluded ("already paid") transaction should count toward the budget's
    # spent — so it lowers remaining obligations — without touching available balance.
    _add_income(client, auth, 2000.0, month=6)
    _add_budget(client, auth, 500.0)
    _add_excluded_transaction(client, auth, 500.0, date="2026-06-10")

    coverage = client.get("/api/summary/6/2026", headers=auth.headers).json()["budget_coverage"]
    assert coverage["remaining_obligations"] == 0.0
    # Excluded txn didn't reduce the all-time balance.
    assert coverage["available_balance"] == 2000.0
    assert coverage["projected_balance"] == 2000.0
    assert coverage["status"] == "on_track"
