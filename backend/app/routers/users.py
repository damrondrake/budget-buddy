from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth import get_current_account
from app.models import User
from app.models.account import Account

router = APIRouter(prefix="/api/users", tags=["users"])


class UserOut(BaseModel):
    id: int
    name: str
    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    name: str


@router.get("", response_model=list[UserOut])
def list_users(
    db: Session = Depends(get_db),
    account: Account = Depends(get_current_account),
):
    return db.query(User).filter(User.account_id == account.id).order_by(User.id).all()


@router.put("/{user_id}", response_model=UserOut)
def update_user(
    user_id: int,
    data: UserUpdate,
    db: Session = Depends(get_db),
    account: Account = Depends(get_current_account),
):
    user = db.query(User).filter(User.id == user_id, User.account_id == account.id).first()
    if not user:
        raise HTTPException(404, "User not found")
    user.name = data.name
    db.commit()
    db.refresh(user)
    return user
