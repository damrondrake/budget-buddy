def _income(auth, amount=2000.0, source="Paycheck", month=6, year=2026):
    return {
        "user_id": auth.user_id,
        "amount": amount,
        "source": source,
        "month": month,
        "year": year,
    }


def test_create_income(client, auth):
    res = client.post("/api/income", headers=auth.headers, json=_income(auth))
    assert res.status_code == 201
    assert res.json()["amount"] == 2000.0
    assert res.json()["source"] == "Paycheck"


def test_list_income_filtered_by_month(client, auth):
    client.post("/api/income", headers=auth.headers, json=_income(auth, month=6))
    client.post("/api/income", headers=auth.headers, json=_income(auth, month=7))
    june = client.get("/api/income", headers=auth.headers, params={"month": 6, "year": 2026}).json()
    assert len(june) == 1


def test_edit_income(client, auth):
    iid = client.post("/api/income", headers=auth.headers, json=_income(auth)).json()["id"]
    res = client.put(
        f"/api/income/{iid}",
        headers=auth.headers,
        json={"user_id": auth.user_id, "amount": 2500.0, "source": "Bonus"},
    )
    assert res.status_code == 200
    assert res.json()["amount"] == 2500.0
    assert res.json()["source"] == "Bonus"


def test_delete_income(client, auth):
    iid = client.post("/api/income", headers=auth.headers, json=_income(auth)).json()["id"]
    assert client.delete(f"/api/income/{iid}", headers=auth.headers).status_code == 204


# --- Starting balance -------------------------------------------------------

def test_set_and_get_starting_balance(client, auth):
    res = client.post("/api/account/starting-balance", headers=auth.headers, json={"amount": 3000.0, "date": "2026-03-15"})
    assert res.status_code == 200
    assert res.json()["amount"] == 3000.0

    got = client.get("/api/account/starting-balance", headers=auth.headers).json()
    assert got["amount"] == 3000.0
    assert got["month"] == 3 and got["year"] == 2026


def test_starting_balance_replaces_in_place(client, auth):
    first = client.post("/api/account/starting-balance", headers=auth.headers, json={"amount": 3000.0, "date": "2026-03-15"}).json()
    second = client.post("/api/account/starting-balance", headers=auth.headers, json={"amount": 5000.0, "date": "2026-03-20"}).json()
    assert first["id"] == second["id"]
    assert second["amount"] == 5000.0


def test_starting_balance_locked_from_income_delete(client, auth):
    client.post("/api/account/starting-balance", headers=auth.headers, json={"amount": 3000.0, "date": "2026-03-15"})
    # It surfaces as a locked income entry that cannot be deleted via /api/income.
    march = client.get("/api/income", headers=auth.headers, params={"month": 3, "year": 2026}).json()
    sb = next(i for i in march if i["type"] == "starting_balance")
    assert client.delete(f"/api/income/{sb['id']}", headers=auth.headers).status_code == 400
    # But it can be removed via the account endpoint.
    assert client.delete("/api/account/starting-balance", headers=auth.headers).status_code == 204
    assert client.get("/api/account/starting-balance", headers=auth.headers).json() is None
