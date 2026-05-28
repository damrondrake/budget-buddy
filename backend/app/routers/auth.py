from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth import hash_password, verify_password, create_access_token, get_current_account
from app.models.account import Account
from app.models.user import User
from app.models.category import Category
from app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse, AccountOut

router = APIRouter(prefix="/api/auth", tags=["auth"])

DEFAULT_CATEGORIES = [
    {"name": "Rent", "color": "#EF4444", "icon": "home"},
    {"name": "Utilities", "color": "#F59E0B", "icon": "zap"},
    {"name": "Groceries", "color": "#10B981", "icon": "shopping-cart"},
    {"name": "Gas", "color": "#6366F1", "icon": "fuel"},
    {"name": "Dining", "color": "#EC4899", "icon": "utensils"},
    {"name": "Entertainment", "color": "#8B5CF6", "icon": "film"},
    {"name": "Subscriptions", "color": "#14B8A6", "icon": "credit-card"},
    {"name": "Medical Expenses", "color": "#0EA5E9", "icon": "heart-pulse"},
    {"name": "Other", "color": "#6B7280", "icon": "more-horizontal"},
]


@router.post("/register", response_model=TokenResponse, status_code=201)
def register(data: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(Account).filter(Account.email == data.email).first()
    if existing:
        raise HTTPException(409, "An account with this email already exists")

    account = Account(
        email=data.email,
        hashed_password=hash_password(data.password),
        display_name=data.display_name,
    )
    db.add(account)
    db.flush()

    # Seed default person slots
    db.add(User(name=data.display_name, account_id=account.id))
    db.add(User(name="Partner", account_id=account.id))

    # Seed default categories
    for cat in DEFAULT_CATEGORIES:
        db.add(Category(account_id=account.id, **cat))

    db.commit()
    return TokenResponse(access_token=create_access_token(account.id))


@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    account = db.query(Account).filter(Account.email == data.email).first()
    if not account or not verify_password(data.password, account.hashed_password):
        raise HTTPException(401, "Invalid email or password")
    return TokenResponse(access_token=create_access_token(account.id))


@router.get("/me", response_model=AccountOut)
def me(account: Account = Depends(get_current_account)):
    return account
