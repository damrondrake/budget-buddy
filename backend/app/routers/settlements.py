from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import extract
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth import get_current_account
from app.models import Settlement, User
from app.models.account import Account
from app.schemas.settlement import SettlementCreate, SettlementOut

router = APIRouter(prefix="/api/settlements", tags=["settlements"])


def _enrich(s: Settlement, names: dict[int, str]) -> SettlementOut:
    return SettlementOut(
        id=s.id,
        paid_by=s.paid_by,
        paid_to=s.paid_to,
        paid_by_name=names.get(s.paid_by),
        paid_to_name=names.get(s.paid_to),
        amount=s.amount,
        note=s.note,
        date=s.date,
        created_at=s.created_at,
    )


def _name_map(db: Session, account_id: int) -> dict[int, str]:
    return {
        u.id: u.name
        for u in db.query(User).filter(User.account_id == account_id).all()
    }


@router.get("", response_model=list[SettlementOut])
def list_settlements(
    month: int = Query(...),
    year: int = Query(...),
    db: Session = Depends(get_db),
    account: Account = Depends(get_current_account),
):
    """List settlements for a given month, newest first."""
    rows = (
        db.query(Settlement)
        .filter(
            Settlement.account_id == account.id,
            extract("month", Settlement.date) == month,
            extract("year", Settlement.date) == year,
        )
        .order_by(Settlement.date.desc(), Settlement.id.desc())
        .all()
    )
    names = _name_map(db, account.id)
    return [_enrich(s, names) for s in rows]


@router.post("", response_model=SettlementOut, status_code=201)
def create_settlement(
    data: SettlementCreate,
    db: Session = Depends(get_db),
    account: Account = Depends(get_current_account),
):
    """Record a settlement payment between two people on the account."""
    names = _name_map(db, account.id)
    if data.paid_by not in names or data.paid_to not in names:
        raise HTTPException(404, "User not found")
    if data.paid_by == data.paid_to:
        raise HTTPException(400, "A settlement must be between two different people.")

    s = Settlement(
        account_id=account.id,
        paid_by=data.paid_by,
        paid_to=data.paid_to,
        amount=data.amount,
        note=data.note or None,
        date=data.date,
    )
    db.add(s)
    db.commit()
    db.refresh(s)
    return _enrich(s, names)


@router.delete("/{settlement_id}", status_code=204)
def delete_settlement(
    settlement_id: int,
    db: Session = Depends(get_db),
    account: Account = Depends(get_current_account),
):
    """Remove a settlement (e.g. recorded by mistake)."""
    s = (
        db.query(Settlement)
        .filter(Settlement.id == settlement_id, Settlement.account_id == account.id)
        .first()
    )
    if not s:
        raise HTTPException(404, "Settlement not found")
    db.delete(s)
    db.commit()
