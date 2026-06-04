from datetime import date as date_type

from pydantic import BaseModel

from app.schemas.common import Amount


class StartingBalanceRequest(BaseModel):
    amount: Amount
    date: date_type


class StartingBalanceOut(BaseModel):
    id: int
    amount: float
    # Reconstructed from the stored month/year (income is month/year granular),
    # so the Settings form can prefill a date input.
    date: date_type
    month: int
    year: int
