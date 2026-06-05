def _txn(auth, amount=50.0, date="2026-06-10", note="Lunch"):
    return {
        "amount": amount,
        "category_id": auth.category_id,
        "paid_by": auth.user_id,
        "date": date,
        "note": note,
    }


def test_create_transaction(client, auth):
    res = client.post("/api/transactions", headers=auth.headers, json=_txn(auth))
    assert res.status_code == 201
    body = res.json()
    assert body["amount"] == 50.0
    assert body["category_id"] == auth.category_id
    assert body["category_name"]  # enriched


def test_create_transaction_unknown_category_404(client, auth):
    payload = _txn(auth)
    payload["category_id"] = 999999
    assert client.post("/api/transactions", headers=auth.headers, json=payload).status_code == 404


def test_create_transaction_invalid_amount_422(client, auth):
    assert client.post("/api/transactions", headers=auth.headers, json=_txn(auth, amount=0)).status_code == 422
    assert client.post("/api/transactions", headers=auth.headers, json=_txn(auth, amount=2_000_000)).status_code == 422


def test_list_filtered_by_month(client, auth):
    client.post("/api/transactions", headers=auth.headers, json=_txn(auth, date="2026-06-05"))
    client.post("/api/transactions", headers=auth.headers, json=_txn(auth, date="2026-07-05"))

    june = client.get("/api/transactions", headers=auth.headers, params={"month": 6, "year": 2026}).json()
    july = client.get("/api/transactions", headers=auth.headers, params={"month": 7, "year": 2026}).json()
    assert len(june) == 1
    assert len(july) == 1
    assert june[0]["date"] == "2026-06-05"


def test_update_transaction(client, auth):
    tid = client.post("/api/transactions", headers=auth.headers, json=_txn(auth)).json()["id"]
    res = client.put(f"/api/transactions/{tid}", headers=auth.headers, json={"amount": 75.0, "note": "Dinner"})
    assert res.status_code == 200
    assert res.json()["amount"] == 75.0
    assert res.json()["note"] == "Dinner"


def test_delete_transaction(client, auth):
    tid = client.post("/api/transactions", headers=auth.headers, json=_txn(auth)).json()["id"]
    assert client.delete(f"/api/transactions/{tid}", headers=auth.headers).status_code == 204
    assert client.get("/api/transactions", headers=auth.headers, params={"month": 6, "year": 2026}).json() == []


# --- Cross-account isolation ------------------------------------------------

def test_cannot_read_other_accounts_transactions(client, register_account):
    a = register_account("a@example.com")
    b = register_account("b@example.com")
    client.post("/api/transactions", headers=a.headers, json=_txn(a))

    # B sees none of A's data.
    b_list = client.get("/api/transactions", headers=b.headers, params={"month": 6, "year": 2026}).json()
    assert b_list == []


def test_cannot_update_or_delete_other_accounts_transaction(client, register_account):
    a = register_account("a@example.com")
    b = register_account("b@example.com")
    tid = client.post("/api/transactions", headers=a.headers, json=_txn(a)).json()["id"]

    # B cannot touch A's transaction.
    assert client.put(f"/api/transactions/{tid}", headers=b.headers, json={"amount": 1.0}).status_code == 404
    assert client.delete(f"/api/transactions/{tid}", headers=b.headers).status_code == 404

    # A's transaction is untouched.
    a_list = client.get("/api/transactions", headers=a.headers, params={"month": 6, "year": 2026}).json()
    assert len(a_list) == 1 and a_list[0]["amount"] == 50.0
