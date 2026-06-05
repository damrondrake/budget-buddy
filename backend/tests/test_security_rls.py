"""Row Level Security penetration tests.

Two separate accounts (A and B) are created. Account A populates every kind of
resource, then account B attempts every cross-account read/write/delete using
A's resource ids. Each targeted operation must return 404 (we deliberately use
404, not 403, so we don't even confirm the resource exists), and collection
reads must never surface A's data.
"""
import pytest


@pytest.fixture()
def accounts(register_account):
    a = register_account("alice@example.com")
    b = register_account("bob@example.com")
    return a, b


@pytest.fixture()
def alices_data(client, accounts):
    """Account A creates one of every resource and we capture the ids."""
    a, _ = accounts
    h = a.headers
    ids = {}

    ids["transaction"] = client.post(
        "/api/transactions", headers=h,
        json={"amount": 50.0, "category_id": a.category_id, "paid_by": a.user_id, "date": "2026-06-10", "note": "secret"},
    ).json()["id"]

    budget = client.post(
        "/api/budgets", headers=h,
        json={"category_id": a.category_id, "month": 6, "year": 2026, "amount_limit": 500.0, "note": None},
    ).json()
    ids["budget"] = budget["id"]
    ids["line_item"] = client.post(
        f"/api/budgets/{budget['id']}/items", headers=h, json={"label": "Electric", "amount": 100.0}
    ).json()["id"]

    ids["income"] = client.post(
        "/api/income", headers=h,
        json={"user_id": a.user_id, "amount": 2000.0, "source": "Pay", "month": 6, "year": 2026},
    ).json()["id"]

    ids["recurring"] = client.post(
        "/api/recurring", headers=h,
        json={"amount": 100.0, "category_id": a.category_id, "paid_by": a.user_id, "is_split": False,
              "day_of_month": 15, "note": "Rent", "frequency": "monthly"},
    ).json()["id"]

    goal = client.post("/api/savings", headers=h, json={"name": "Vacation", "color": "#22C55E"}).json()
    ids["goal"] = goal["id"]
    ids["allocation"] = client.post(
        f"/api/savings/{goal['id']}/allocations", headers=h, json={"label": "Flights", "target_amount": 500.0}
    ).json()["id"]

    client.post("/api/account/starting-balance", headers=h, json={"amount": 1000.0, "date": "2026-01-01"})
    ids["category"] = a.category_id
    ids["user"] = a.user_id
    return ids


# --- Collection reads: B must never see A's data ----------------------------

def test_b_cannot_read_as_collections(client, accounts, alices_data):
    _, b = accounts
    h = b.headers
    assert client.get("/api/transactions", headers=h, params={"month": 6, "year": 2026}).json() == []
    assert client.get("/api/budgets", headers=h, params={"month": 6, "year": 2026}).json() == []
    assert client.get("/api/income", headers=h, params={"month": 6, "year": 2026}).json() == []
    assert client.get("/api/recurring", headers=h).json() == []
    assert client.get("/api/savings", headers=h).json() == []
    # B's category list must not contain A's category id.
    b_cat_ids = {c["id"] for c in client.get("/api/categories", headers=h).json()}
    assert alices_data["category"] not in b_cat_ids
    # B has no starting balance even though A does.
    assert client.get("/api/account/starting-balance", headers=h).json() is None


# --- Transactions ------------------------------------------------------------

def test_b_cannot_modify_or_delete_a_transaction(client, accounts, alices_data):
    _, b = accounts
    tid = alices_data["transaction"]
    assert client.put(f"/api/transactions/{tid}", headers=b.headers, json={"amount": 1.0}).status_code == 404
    assert client.delete(f"/api/transactions/{tid}", headers=b.headers).status_code == 404


# --- Budgets + line items (sub-resource) ------------------------------------

def test_b_cannot_touch_a_budget(client, accounts, alices_data):
    _, b = accounts
    bid = alices_data["budget"]
    assert client.delete(f"/api/budgets/{bid}", headers=b.headers).status_code == 404
    assert client.put(f"/api/budgets/{bid}/paid", headers=b.headers, json={"paid": True}).status_code == 404
    assert client.post(f"/api/budgets/{bid}/items", headers=b.headers, json={"label": "X", "amount": 1.0}).status_code == 404


def test_b_cannot_touch_a_budget_line_item(client, accounts, alices_data):
    _, b = accounts
    bid, item = alices_data["budget"], alices_data["line_item"]
    assert client.put(f"/api/budgets/{bid}/items/{item}", headers=b.headers, json={"label": "X", "amount": 2.0}).status_code == 404
    assert client.delete(f"/api/budgets/{bid}/items/{item}", headers=b.headers).status_code == 404


# --- Income ------------------------------------------------------------------

def test_b_cannot_touch_a_income(client, accounts, alices_data):
    _, b = accounts
    iid = alices_data["income"]
    assert client.put(f"/api/income/{iid}", headers=b.headers,
                      json={"user_id": b.user_id, "amount": 1.0, "source": "x"}).status_code == 404
    assert client.delete(f"/api/income/{iid}", headers=b.headers).status_code == 404


# --- Recurring ---------------------------------------------------------------

def test_b_cannot_delete_a_recurring(client, accounts, alices_data):
    _, b = accounts
    assert client.delete(f"/api/recurring/{alices_data['recurring']}", headers=b.headers).status_code == 404


# --- Savings goal + allocations + transactions (sub-resources) --------------

def test_b_cannot_touch_a_savings(client, accounts, alices_data):
    _, b = accounts
    gid, alloc = alices_data["goal"], alices_data["allocation"]
    assert client.delete(f"/api/savings/{gid}", headers=b.headers).status_code == 404
    assert client.post(f"/api/savings/{gid}/allocations", headers=b.headers,
                       json={"label": "Y", "target_amount": 1.0}).status_code == 404
    assert client.delete(f"/api/savings/{gid}/allocations/{alloc}", headers=b.headers).status_code == 404
    assert client.post(f"/api/savings/{gid}/transactions", headers=b.headers,
                       json={"amount": 10.0, "type": "deposit", "date": "2026-06-10", "paid_by": b.user_id}).status_code == 404
    assert client.get(f"/api/savings/{gid}/transactions", headers=b.headers).status_code == 404


# --- Categories / Users ------------------------------------------------------

def test_b_cannot_delete_a_category_or_edit_a_user(client, accounts, alices_data):
    _, b = accounts
    assert client.delete(f"/api/categories/{alices_data['category']}", headers=b.headers).status_code == 404
    assert client.put(f"/api/users/{alices_data['user']}", headers=b.headers, json={"name": "Hacked"}).status_code == 404


# --- Account deletion isolation ---------------------------------------------

def test_account_deletion_only_affects_caller(client, accounts, alices_data):
    a, b = accounts
    # B deletes B's own account (the only account deletion can ever target).
    assert client.delete("/api/auth/account", headers=b.headers).status_code == 200
    # A's data is completely intact.
    a_txns = client.get("/api/transactions", headers=a.headers, params={"month": 6, "year": 2026}).json()
    assert len(a_txns) == 1
    assert client.get("/api/account/starting-balance", headers=a.headers).json()["amount"] == 1000.0


# --- Unauthenticated access --------------------------------------------------

def test_endpoints_reject_missing_token(client):
    assert client.get("/api/transactions").status_code == 401
    assert client.get("/api/budgets", params={"month": 6, "year": 2026}).status_code == 401
    assert client.get("/api/savings").status_code == 401
    assert client.get("/api/changelog/latest").status_code == 401
    assert client.delete("/api/auth/account").status_code == 401
