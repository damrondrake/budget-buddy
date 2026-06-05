from datetime import date as date_type, datetime

from pydantic import BaseModel

from app.schemas.common import Amount, BoundedDate, NoteStr


class SettlementCreate(BaseModel):
    paid_by: int
    paid_to: int
    amount: Amount
    note: NoteStr | None = None
    date: BoundedDate


class SettlementOut(BaseModel):
    id: int
    paid_by: int
    paid_to: int
    paid_by_name: str | None = None
    paid_to_name: str | None = None
    amount: float
    note: str | None = None
    date: date_type
    created_at: datetime

    model_config = {"from_attributes": True}
