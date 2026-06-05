def _budget(auth, month=6, year=2026, amount_limit=500.0):
    return {
        "category_id": auth.category_id,
        "month": month,
        "year": year,
        "amount_limit": amount_limit,
        "note": None,
    }


def test_create_and_list_budget(client, auth):
    res = client.post("/api/budgets", headers=auth.headers, json=_budget(auth))
    assert res.status_code == 201
    assert res.json()["amount_limit"] == 500.0

    listed = client.get("/api/budgets", headers=auth.headers, params={"month": 6, "year": 2026}).json()
    assert len(listed) == 1


def test_upsert_updates_existing_budget(client, auth):
    first = client.post("/api/budgets", headers=auth.headers, json=_budget(auth, amount_limit=500)).json()
    second = client.post("/api/budgets", headers=auth.headers, json=_budget(auth, amount_limit=800)).json()
    # Same category/month/year => updated in place, not duplicated.
    assert first["id"] == second["id"]
    assert second["amount_limit"] == 800.0
    listed = client.get("/api/budgets", headers=auth.headers, params={"month": 6, "year": 2026}).json()
    assert len(listed) == 1


def test_copy_last_months_budgets(client, auth):
    client.post("/api/budgets", headers=auth.headers, json=_budget(auth, month=5, year=2026))
    res = client.post(
        "/api/budgets/copy",
        headers=auth.headers,
        json={"from_month": 5, "from_year": 2026, "to_month": 6, "to_year": 2026},
    )
    assert res.status_code == 200
    assert res.json()["copied"] == 1
    assert len(client.get("/api/budgets", headers=auth.headers, params={"month": 6, "year": 2026}).json()) == 1


def test_line_items_add_edit_delete(client, auth):
    budget_id = client.post("/api/budgets", headers=auth.headers, json=_budget(auth)).json()["id"]

    add = client.post(f"/api/budgets/{budget_id}/items", headers=auth.headers, json={"label": "Electric", "amount": 120.0})
    assert add.status_code == 201
    item_id = add.json()["id"]

    edit = client.put(
        f"/api/budgets/{budget_id}/items/{item_id}",
        headers=auth.headers,
        json={"label": "Power", "amount": 130.0},
    )
    assert edit.status_code == 200
    assert edit.json()["label"] == "Power"
    assert edit.json()["amount"] == 130.0

    # Line item shows on the budget.
    budget = client.get("/api/budgets", headers=auth.headers, params={"month": 6, "year": 2026}).json()[0]
    assert len(budget["line_items"]) == 1

    assert client.delete(f"/api/budgets/{budget_id}/items/{item_id}", headers=auth.headers).status_code == 204
    budget = client.get("/api/budgets", headers=auth.headers, params={"month": 6, "year": 2026}).json()[0]
    assert budget["line_items"] == []


def test_mark_budget_as_paid(client, auth):
    budget_id = client.post("/api/budgets", headers=auth.headers, json=_budget(auth)).json()["id"]
    res = client.put(f"/api/budgets/{budget_id}/paid", headers=auth.headers, json={"paid": True})
    assert res.status_code == 200
    assert res.json()["paid"] is True


def test_delete_budget(client, auth):
    budget_id = client.post("/api/budgets", headers=auth.headers, json=_budget(auth)).json()["id"]
    assert client.delete(f"/api/budgets/{budget_id}", headers=auth.headers).status_code == 204
    assert client.get("/api/budgets", headers=auth.headers, params={"month": 6, "year": 2026}).json() == []
