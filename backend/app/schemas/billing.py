from datetime import datetime

from pydantic import BaseModel


class SubscriptionOut(BaseModel):
    """The current account's plan and subscription status."""

    plan: str  # 'free' | 'pro'
    status: str  # 'active' | 'canceled' | 'past_due'
    current_period_end: datetime | None = None


class CheckoutSessionOut(BaseModel):
    """URL to redirect the browser to for Stripe Checkout."""

    url: str


class PortalSessionOut(BaseModel):
    """URL to redirect the browser to for the Stripe Customer Portal."""

    url: str
