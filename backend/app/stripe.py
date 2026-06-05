"""Stripe client initialization and billing constants.

PII note: BudgetBuddy never sees or stores credit card data. Stripe hosts
Checkout and the Customer Portal, so card numbers, CVCs, and bank details are
entered directly on Stripe's pages. We only persist Stripe's opaque reference
IDs (``stripe_customer_id`` / ``stripe_subscription_id``), which are not PII.

Keys are read lazily (at call time) rather than cached at import, so values the
platform (Railway) injects are always picked up, and the app still imports
cleanly when Stripe is unconfigured (local dev / tests).
"""
import os

import stripe
from dotenv import load_dotenv

# override=False so platform-injected env vars (Railway) always win over any .env file.
load_dotenv(override=False)

# Pro plan pricing lives here so the amount is defined in exactly one place.
PRO_PRICE_CENTS = 499  # $4.99 / month
PRO_PRODUCT_NAME = "BudgetBuddy Pro"


def get_secret_key() -> str | None:
    return os.getenv("STRIPE_SECRET_KEY")


def get_webhook_secret() -> str | None:
    return os.getenv("STRIPE_WEBHOOK_SECRET")


def stripe_configured() -> bool:
    """True when a secret key is present (billing endpoints are usable)."""
    return bool(get_secret_key())


def get_client():
    """Return the Stripe SDK with its API key configured from the environment.

    Raises RuntimeError if STRIPE_SECRET_KEY is unset so callers fail loudly
    instead of making unauthenticated Stripe calls.
    """
    key = get_secret_key()
    if not key:
        raise RuntimeError("STRIPE_SECRET_KEY is not set")
    stripe.api_key = key
    return stripe
