"""Reusable validated field types shared across request schemas.

Centralizing the constraints here keeps the per-router schemas terse and makes
the rules (money ranges, text lengths, date bounds) consistent everywhere, so
invalid input is rejected with a 422 before it reaches the database.
"""
from datetime import date as date_type, timedelta
from typing import Annotated

from pydantic import AfterValidator, Field, StringConstraints

# --- Money ------------------------------------------------------------------
# Positive monetary amount, strictly below one million.
Amount = Annotated[float, Field(gt=0, lt=1_000_000)]
# Allows exactly zero (e.g. a budget limit of 0), still below one million.
NonNegativeAmount = Annotated[float, Field(ge=0, lt=1_000_000)]
# Strictly positive, no upper bound (savings transaction amounts).
PositiveAmount = Annotated[float, Field(gt=0)]
# Zero or more, no upper bound (savings allocation targets).
TargetAmount = Annotated[float, Field(ge=0)]

# --- Text -------------------------------------------------------------------
# Free-text note: whitespace-stripped, up to 255 chars. Empty string allowed.
NoteStr = Annotated[str, StringConstraints(strip_whitespace=True, max_length=255)]
# Required short label/name: stripped, non-empty, up to 100 chars.
Label100 = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)
]
# A person's display name: stripped, 2-50 chars.
DisplayName = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=2, max_length=50)
]

# --- Other ------------------------------------------------------------------
# Day of the month for recurring transactions.
DayOfMonth = Annotated[int, Field(ge=1, le=31)]


def _not_far_future(value: date_type) -> date_type:
    """A date may be in the past but no more than one year ahead of today."""
    if value > date_type.today() + timedelta(days=365):
        raise ValueError("date must not be more than 1 year in the future")
    return value


# A calendar date bounded to at most one year in the future.
BoundedDate = Annotated[date_type, AfterValidator(_not_far_future)]
