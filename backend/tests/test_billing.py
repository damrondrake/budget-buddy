"""Billing endpoint tests.

These cover behavior that doesn't require talking to Stripe: the default
free-plan response, auth enforcement, the get_current_plan helper resolving the
subscriptions table, and the webhook handlers' effect on the local row. Stripe
network calls (Checkout/Portal) are intentionally not exercised here.
"""
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models import Account, Subscription, WaitlistEntry
from app.routers.billing import (
    _handle_checkout_completed,
    _handle_subscription_deleted,
    _handle_subscription_updated,
    get_current_plan,
)


def _account(db_engine) -> Account:
    with Session(db_engine) as s:
        return s.query(Account).first()


def test_subscription_defaults_to_free(client, auth):
    res = client.get("/api/billing/subscription", headers=auth.headers)
    assert res.status_code == 200
    body = res.json()
    assert body["plan"] == "free"
    assert body["status"] == "active"


def test_subscription_requires_auth(client):
    assert client.get("/api/billing/subscription").status_code == 401


def test_waitlist_signup_persists_row(client, auth, db_engine):
    res = client.post(
        "/api/billing/waitlist",
        headers=auth.headers,
        json={"email": "Future.User@Example.com"},
    )
    assert res.status_code == 200, res.text
    assert "launch" in res.json()["message"].lower()

    with Session(db_engine) as s:
        rows = s.query(WaitlistEntry).all()
        assert len(rows) == 1
        # Stored normalized (trimmed + lowercased) and tied to the account.
        assert rows[0].email == "future.user@example.com"
        assert rows[0].account_id is not None


def test_waitlist_signup_is_idempotent(client, auth, db_engine):
    for _ in range(3):
        client.post(
            "/api/billing/waitlist",
            headers=auth.headers,
            json={"email": "dupe@example.com"},
        )
    with Session(db_engine) as s:
        assert s.query(WaitlistEntry).filter_by(email="dupe@example.com").count() == 1


def test_waitlist_rejects_invalid_email(client, auth):
    res = client.post(
        "/api/billing/waitlist",
        headers=auth.headers,
        json={"email": "not-an-email"},
    )
    assert res.status_code == 422


def test_waitlist_requires_auth(client):
    assert client.post("/api/billing/waitlist", json={"email": "a@b.com"}).status_code == 401


def test_get_current_plan_reflects_active_pro(client, auth, db_engine):
    acct = _account(db_engine)
    with Session(db_engine) as s:
        s.add(
            Subscription(
                account_id=acct.id,
                stripe_customer_id="cus_test",
                stripe_subscription_id="sub_test",
                plan="pro",
                status="active",
            )
        )
        s.commit()
        assert get_current_plan(s, acct) == "pro"

    res = client.get("/api/billing/subscription", headers=auth.headers).json()
    assert res["plan"] == "pro"


def test_get_current_plan_is_free_when_past_due(client, auth, db_engine):
    acct = _account(db_engine)
    with Session(db_engine) as s:
        s.add(
            Subscription(
                account_id=acct.id,
                stripe_customer_id="cus_test",
                plan="pro",
                status="past_due",
            )
        )
        s.commit()
        # Entitlement is gated on 'active' status only.
        assert get_current_plan(s, acct) == "free"


def test_webhook_checkout_completed_activates_pro(client, auth, db_engine):
    acct = _account(db_engine)
    with Session(db_engine) as s:
        s.add(
            Subscription(
                account_id=acct.id,
                stripe_customer_id="cus_123",
                plan="free",
                status="active",
            )
        )
        s.commit()

        _handle_checkout_completed(
            s,
            {
                "metadata": {"account_id": str(acct.id)},
                "customer": "cus_123",
                "subscription": "sub_123",
            },
        )
        sub = s.query(Subscription).filter_by(account_id=acct.id).first()
        assert sub.plan == "pro"
        assert sub.status == "active"
        assert sub.stripe_subscription_id == "sub_123"


def test_webhook_subscription_updated_past_due(client, auth, db_engine):
    acct = _account(db_engine)
    with Session(db_engine) as s:
        s.add(
            Subscription(
                account_id=acct.id,
                stripe_customer_id="cus_123",
                stripe_subscription_id="sub_123",
                plan="pro",
                status="active",
            )
        )
        s.commit()

        period_end = int(datetime(2030, 1, 1, tzinfo=timezone.utc).timestamp())
        _handle_subscription_updated(
            s,
            {
                "id": "sub_123",
                "customer": "cus_123",
                "status": "past_due",
                "current_period_end": period_end,
            },
        )
        sub = s.query(Subscription).filter_by(account_id=acct.id).first()
        assert sub.status == "past_due"
        assert sub.plan == "pro"  # still on the Pro tier, just behind on payment
        assert sub.current_period_end is not None


def test_webhook_subscription_deleted_downgrades(client, auth, db_engine):
    acct = _account(db_engine)
    with Session(db_engine) as s:
        s.add(
            Subscription(
                account_id=acct.id,
                stripe_customer_id="cus_123",
                stripe_subscription_id="sub_123",
                plan="pro",
                status="active",
            )
        )
        s.commit()

        _handle_subscription_deleted(s, {"customer": "cus_123"})
        sub = s.query(Subscription).filter_by(account_id=acct.id).first()
        assert sub.status == "canceled"
        assert sub.plan == "free"
        assert sub.stripe_subscription_id is None
