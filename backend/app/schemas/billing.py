from datetime import datetime

from pydantic import BaseModel, EmailStr


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


class WaitlistRequest(BaseModel):
    """An email signup for the upcoming Pro launch."""

    email: EmailStr


class WaitlistOut(BaseModel):
    """Confirmation message after joining the Pro waitlist."""

    message: str
