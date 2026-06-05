"""Settlement endpoint tests, including the effect on the split balance.

A fresh account has two person-slots (the registrant + an auto-created
"Partner"), which is exactly what a couples Settle Up flow needs.
"""


def _both_users(client, auth):
    rows = client.get("/api/users", headers=auth.headers).json()
    assert len(rows) >= 2
    return rows[0], rows[1]


def _add_split_transaction(client, auth, amount, paid_by, date="2026-06-10"):
    return client.post(
        "/api/transactions",
        headers=auth.headers,
        json={
            "amount": amount,
            "category_id": auth.category_id,
            "paid_by": paid_by,
            "is_split": True,
            "date": date,
        },
    )


def _balance(client, auth, name):
    summary = client.get("/api/summary/6/2026", headers=auth.headers).json()
    return summary["balance_between_users"][name]


def test_settlement_zeroes_out_the_balance(client, auth):
    u1, u2 = _both_users(client, auth)
    # u1 pays $100 split → u2 owes u1 $50.
    _add_split_transaction(client, auth, 100.0, paid_by=u1["id"])
    assert _balance(client, auth, u1["name"]) == 50.0

    # u2 settles up by paying u1 $50.
    res = client.post(
        "/api/settlements",
        headers=auth.headers,
        json={"paid_by": u2["id"], "paid_to": u1["id"], "amount": 50.0, "date": "2026-06-15"},
    )
    assert res.status_code == 201, res.text

    # Balance is now settled.
    assert _balance(client, auth, u1["name"]) == 0.0
    assert _balance(client, auth, u2["name"]) == 0.0


def test_partial_settlement_reduces_balance(client, auth):
    u1, u2 = _both_users(client, auth)
    _add_split_transaction(client, auth, 100.0, paid_by=u1["id"])  # u2 owes 50

    client.post(
        "/api/settlements",
        headers=auth.headers,
        json={"paid_by": u2["id"], "paid_to": u1["id"], "amount": 20.0, "date": "2026-06-15"},
    )
    assert _balance(client, auth, u1["name"]) == 30.0


def test_list_settlements_scoped_to_month(client, auth):
    u1, u2 = _both_users(client, auth)
    client.post(
        "/api/settlements",
        headers=auth.headers,
        json={"paid_by": u2["id"], "paid_to": u1["id"], "amount": 25.0, "date": "2026-06-15"},
    )
    client.post(
        "/api/settlements",
        headers=auth.headers,
        json={"paid_by": u2["id"], "paid_to": u1["id"], "amount": 10.0, "date": "2026-07-01"},
    )

    june = client.get("/api/settlements", headers=auth.headers, params={"month": 6, "year": 2026}).json()
    assert len(june) == 1
    assert june[0]["amount"] == 25.0
    assert june[0]["paid_by_name"] == u2["name"]
    assert june[0]["paid_to_name"] == u1["name"]


def test_create_settlement_rejects_same_person(client, auth):
    u1, _ = _both_users(client, auth)
    res = client.post(
        "/api/settlements",
        headers=auth.headers,
        json={"paid_by": u1["id"], "paid_to": u1["id"], "amount": 10.0, "date": "2026-06-15"},
    )
    assert res.status_code == 400


def test_create_settlement_rejects_unknown_user(client, auth):
    u1, _ = _both_users(client, auth)
    res = client.post(
        "/api/settlements",
        headers=auth.headers,
        json={"paid_by": u1["id"], "paid_to": 99999, "amount": 10.0, "date": "2026-06-15"},
    )
    assert res.status_code == 404


def test_delete_settlement_restores_balance(client, auth):
    u1, u2 = _both_users(client, auth)
    _add_split_transaction(client, auth, 100.0, paid_by=u1["id"])  # u2 owes 50
    res = client.post(
        "/api/settlements",
        headers=auth.headers,
        json={"paid_by": u2["id"], "paid_to": u1["id"], "amount": 50.0, "date": "2026-06-15"},
    )
    settlement_id = res.json()["id"]
    assert _balance(client, auth, u1["name"]) == 0.0

    assert client.delete(f"/api/settlements/{settlement_id}", headers=auth.headers).status_code == 204
    # Removing the settlement brings the debt back.
    assert _balance(client, auth, u1["name"]) == 50.0


def test_settlements_require_auth(client):
    assert client.get("/api/settlements", params={"month": 6, "year": 2026}).status_code == 401
