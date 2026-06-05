def _recurring(auth, day_of_month=15, frequency="monthly", note="Rent"):
    return {
        "amount": 100.0,
        "category_id": auth.category_id,
        "paid_by": auth.user_id,
        "is_split": False,
        "day_of_month": day_of_month,
        "note": note,
        "frequency": frequency,
    }


def test_create_recurring(client, auth):
    res = client.post("/api/recurring", headers=auth.headers, json=_recurring(auth))
    assert res.status_code == 201
    body = res.json()
    assert body["frequency"] == "monthly"
    assert body["day_of_month"] == 15
    assert client.get("/api/recurring", headers=auth.headers).json()


def test_create_recurring_rejects_bad_day(client, auth):
    assert client.post("/api/recurring", headers=auth.headers, json=_recurring(auth, day_of_month=40)).status_code == 422


def test_delete_recurring(client, auth):
    rid = client.post("/api/recurring", headers=auth.headers, json=_recurring(auth)).json()["id"]
    assert client.delete(f"/api/recurring/{rid}", headers=auth.headers).status_code == 204
    assert client.get("/api/recurring", headers=auth.headers).json() == []


def test_apply_due_is_idempotent(client, auth):
    client.post("/api/recurring", headers=auth.headers, json=_recurring(auth))

    first = client.post("/api/recurring/apply-due", headers=auth.headers).json()
    assert first["applied"] == 1  # monthly rule applied once for the current month

    second = client.post("/api/recurring/apply-due", headers=auth.headers).json()
    assert second["applied"] == 0  # already applied — safe to call again


def test_apply_due_links_transaction_to_rule(client, auth):
    rid = client.post("/api/recurring", headers=auth.headers, json=_recurring(auth)).json()["id"]
    result = client.post("/api/recurring/apply-due", headers=auth.headers)
    month, year = result.json()["month"], result.json()["year"]
    txns = client.get("/api/transactions", headers=auth.headers, params={"month": month, "year": year}).json()
    created = [t for t in txns if t["recurring_id"] == rid]
    assert len(created) == 1
    assert created[0]["is_recurring"] is True
