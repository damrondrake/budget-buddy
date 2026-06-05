"""Stripe billing: Checkout, webhook, subscription status, and Customer Portal.

PII-safe by design: card data is entered on Stripe-hosted pages and never
touches this server. We persist only Stripe's reference IDs and the resolved
plan/status on the ``subscriptions`` table.

NOTE: all features currently remain available to everyone regardless of plan.
``get_current_plan`` exists so feature gating can be layered on in a follow-up
without reworking this router.
"""
import logging
from datetime import datetime, timezone

import stripe
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.auth import get_current_account
from app.database import get_db
from app.email import get_frontend_url
from app.models.account import Account
from app.models.subscription import Subscription
from app.models.waitlist import WaitlistEntry
from app.schemas.billing import (
    CheckoutSessionOut,
    PortalSessionOut,
    SubscriptionOut,
    WaitlistOut,
    WaitlistRequest,
)
from app.stripe import (
    PRO_PRICE_CENTS,
    PRO_PRODUCT_NAME,
    get_client,
    get_webhook_secret,
    stripe_configured,
)

router = APIRouter(prefix="/api/billing", tags=["billing"])

_log = logging.getLogger("uvicorn.error")


# --- Helpers ----------------------------------------------------------------

def _get_subscription(db: Session, account_id: int) -> Subscription | None:
    return (
        db.query(Subscription)
        .filter(Subscription.account_id == account_id)
        .first()
    )


def _get_by_customer(db: Session, customer_id: str | None) -> Subscription | None:
    if not customer_id:
        return None
    return (
        db.query(Subscription)
        .filter(Subscription.stripe_customer_id == customer_id)
        .first()
    )


def get_current_plan(db: Session, account: Account) -> str:
    """Return 'pro' if the account has an active Pro subscription, else 'free'.

    This is the single source of truth for plan entitlement. Feature gating
    (added later) should call this rather than reading the column directly.
    """
    sub = _get_subscription(db, account.id)
    if sub and sub.plan == "pro" and sub.status == "active":
        return "pro"
    return "free"


def _map_status(stripe_status: str | None) -> str:
    """Collapse Stripe's subscription statuses onto our three values."""
    if stripe_status in ("active", "trialing"):
        return "active"
    if stripe_status == "past_due":
        return "past_due"
    return "canceled"


# --- Endpoints --------------------------------------------------------------

@router.post("/create-checkout", response_model=CheckoutSessionOut)
def create_checkout(
    db: Session = Depends(get_db),
    account: Account = Depends(get_current_account),
):
    """Create a Stripe Checkout session for the Pro plan ($4.99/month).

    Reuses (or creates) a Stripe customer for this account, then returns the
    hosted Checkout URL for the browser to redirect to.
    """
    if not stripe_configured():
        raise HTTPException(503, "Billing is not configured.")

    client = get_client()
    sub = _get_subscription(db, account.id)
    customer_id = sub.stripe_customer_id if sub else None

    if not customer_id:
        customer = client.Customer.create(
            email=account.email,
            metadata={"account_id": str(account.id)},
        )
        customer_id = customer.id
        if sub:
            sub.stripe_customer_id = customer_id
        else:
            sub = Subscription(
                account_id=account.id,
                stripe_customer_id=customer_id,
                plan="free",
                status="active",
            )
            db.add(sub)
        db.commit()

    frontend = get_frontend_url()
    session = client.checkout.Session.create(
        mode="subscription",
        customer=customer_id,
        line_items=[
            {
                "price_data": {
                    "currency": "usd",
                    "product_data": {"name": PRO_PRODUCT_NAME},
                    "unit_amount": PRO_PRICE_CENTS,
                    "recurring": {"interval": "month"},
                },
                "quantity": 1,
            }
        ],
        success_url=f"{frontend}/billing?success=true",
        cancel_url=f"{frontend}/billing?canceled=true",
        metadata={"account_id": str(account.id)},
    )
    return CheckoutSessionOut(url=session.url)


@router.post("/webhook")
async def webhook(request: Request, db: Session = Depends(get_db)):
    """Receive and verify Stripe webhook events, then sync the local row.

    Handles checkout.session.completed (activate), customer.subscription.updated
    (status change), and customer.subscription.deleted (downgrade to free).
    Signature is verified against STRIPE_WEBHOOK_SECRET so spoofed calls are
    rejected.
    """
    webhook_secret = get_webhook_secret()
    if not webhook_secret:
        raise HTTPException(503, "Webhook secret is not configured.")

    client = get_client()
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    try:
        event = client.Webhook.construct_event(payload, sig_header, webhook_secret)
    except ValueError:
        # Malformed payload.
        raise HTTPException(400, "Invalid payload.")
    except stripe.error.SignatureVerificationError:
        # Signature didn't match — not actually from Stripe.
        raise HTTPException(400, "Invalid signature.")

    event_type = event["type"]
    obj = event["data"]["object"]

    if event_type == "checkout.session.completed":
        _handle_checkout_completed(db, obj)
    elif event_type == "customer.subscription.updated":
        _handle_subscription_updated(db, obj)
    elif event_type == "customer.subscription.deleted":
        _handle_subscription_deleted(db, obj)
    else:
        _log.info("Unhandled Stripe webhook event: %s", event_type)

    return {"received": True}


@router.get("/subscription", response_model=SubscriptionOut)
def get_subscription_status(
    db: Session = Depends(get_db),
    account: Account = Depends(get_current_account),
):
    """Return the current account's plan and subscription status."""
    sub = _get_subscription(db, account.id)
    if not sub:
        return SubscriptionOut(plan="free", status="active", current_period_end=None)
    return SubscriptionOut(
        plan=get_current_plan(db, account),
        status=sub.status,
        current_period_end=sub.current_period_end,
    )


@router.post("/create-portal", response_model=PortalSessionOut)
def create_portal(
    db: Session = Depends(get_db),
    account: Account = Depends(get_current_account),
):
    """Create a Stripe Customer Portal session so the user can manage/cancel."""
    if not stripe_configured():
        raise HTTPException(503, "Billing is not configured.")

    sub = _get_subscription(db, account.id)
    if not sub or not sub.stripe_customer_id:
        raise HTTPException(400, "No Stripe customer exists for this account yet.")

    client = get_client()
    session = client.billing_portal.Session.create(
        customer=sub.stripe_customer_id,
        return_url=f"{get_frontend_url()}/billing",
    )
    return PortalSessionOut(url=session.url)


@router.post("/waitlist", response_model=WaitlistOut)
def join_waitlist(
    data: WaitlistRequest,
    db: Session = Depends(get_db),
    account: Account = Depends(get_current_account),
):
    """Add an email to the BudgetBuddy Pro launch waitlist.

    Pro isn't purchasable yet — the Billing page collects interested emails here
    instead of starting Stripe Checkout. Idempotent per account+email so repeated
    submissions don't create duplicate rows.
    """
    email = str(data.email).strip().lower()
    existing = (
        db.query(WaitlistEntry)
        .filter(
            WaitlistEntry.email == email,
            WaitlistEntry.account_id == account.id,
        )
        .first()
    )
    if not existing:
        db.add(WaitlistEntry(email=email, account_id=account.id))
        db.commit()
    return WaitlistOut(
        message="You're on the list! We'll email you when BudgetBuddy Pro launches."
    )


# --- Webhook event handlers -------------------------------------------------

def _handle_checkout_completed(db: Session, session_obj: dict) -> None:
    """checkout.session.completed → activate the Pro subscription."""
    metadata = session_obj.get("metadata") or {}
    account_id = metadata.get("account_id")
    customer_id = session_obj.get("customer")
    subscription_id = session_obj.get("subscription")

    sub = None
    if account_id:
        try:
            sub = _get_subscription(db, int(account_id))
        except (TypeError, ValueError):
            sub = None
    if sub is None:
        sub = _get_by_customer(db, customer_id)
    if sub is None:
        _log.warning("checkout.session.completed: no subscription row matched.")
        return

    if customer_id:
        sub.stripe_customer_id = customer_id
    if subscription_id:
        sub.stripe_subscription_id = subscription_id
    sub.plan = "pro"
    sub.status = "active"
    db.commit()


def _handle_subscription_updated(db: Session, sub_obj: dict) -> None:
    """customer.subscription.updated → sync status / period / plan."""
    sub = _get_by_customer(db, sub_obj.get("customer"))
    if sub is None:
        return

    if sub_obj.get("id"):
        sub.stripe_subscription_id = sub_obj["id"]
    sub.status = _map_status(sub_obj.get("status"))
    # Pro tier as long as the subscription isn't fully canceled.
    sub.plan = "pro" if sub.status in ("active", "past_due") else "free"

    period_end = sub_obj.get("current_period_end")
    if period_end:
        sub.current_period_end = datetime.fromtimestamp(period_end, tz=timezone.utc)
    db.commit()


def _handle_subscription_deleted(db: Session, sub_obj: dict) -> None:
    """customer.subscription.deleted → cancel and downgrade to free."""
    sub = _get_by_customer(db, sub_obj.get("customer"))
    if sub is None:
        return

    sub.status = "canceled"
    sub.plan = "free"
    sub.stripe_subscription_id = None
    db.commit()
