import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_account,
    get_token_account,
)
from app.email import send_password_reset_email, send_invite_email, resend_configured
from app.models.account import Account
from app.models.account_member import AccountMember
from app.models.user import User
from app.models.category import Category
from app.schemas.auth import (
    RegisterRequest,
    LoginRequest,
    TokenResponse,
    AccountOut,
    MessageResponse,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    InviteRequest,
    AcceptInviteLogin,
    AcceptInviteRegister,
)

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
    {"name": "Savings", "color": "#22C55E", "icon": "piggy-bank"},
    {"name": "Amazon", "color": "#FF9900", "icon": "shopping-bag"},
    {"name": "Other", "color": "#6B7280", "icon": "more-horizontal"},
]


def _utcnow() -> datetime:
    """Naive UTC, so comparisons stay consistent across SQLite and Postgres."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _member_count(db: Session, account_id: int) -> int:
    """People sharing an account: the implicit owner plus invited members."""
    members = (
        db.query(AccountMember)
        .filter(AccountMember.account_id == account_id, AccountMember.role == "member")
        .count()
    )
    return 1 + members


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
def me(
    token_account: Account = Depends(get_token_account),
    effective: Account = Depends(get_current_account),
    db: Session = Depends(get_db),
):
    is_member = effective.id != token_account.id
    return AccountOut(
        id=token_account.id,
        email=token_account.email,
        display_name=token_account.display_name,
        is_shared=_member_count(db, effective.id) > 1,
        member_count=_member_count(db, effective.id),
        role="member" if is_member else "owner",
    )


# ---------------------------------------------------------------------------
# Password reset
# ---------------------------------------------------------------------------


@router.post("/forgot-password", response_model=MessageResponse)
def forgot_password(data: ForgotPasswordRequest, db: Session = Depends(get_db)):
    account = db.query(Account).filter(Account.email == data.email).first()
    generic = "If an account exists for that email, a reset link has been sent."

    # Don't reveal whether the email is registered.
    if not account:
        return MessageResponse(message=generic)

    token = secrets.token_urlsafe(32)
    account.reset_token = token
    account.reset_token_expires = _utcnow() + timedelta(hours=1)
    db.commit()

    send_password_reset_email(account.email, token)
    return MessageResponse(
        message=generic,
        debug_token=None if resend_configured() else token,
    )


@router.post("/reset-password", response_model=MessageResponse)
def reset_password(data: ResetPasswordRequest, db: Session = Depends(get_db)):
    account = db.query(Account).filter(Account.reset_token == data.token).first()
    if (
        not account
        or not account.reset_token_expires
        or account.reset_token_expires < _utcnow()
    ):
        raise HTTPException(400, "This reset link is invalid or has expired.")

    account.hashed_password = hash_password(data.password)
    account.reset_token = None
    account.reset_token_expires = None
    db.commit()
    return MessageResponse(message="Your password has been reset. You can now sign in.")


# ---------------------------------------------------------------------------
# Collaborative accounts (partner invites)
# ---------------------------------------------------------------------------


@router.post("/invite", response_model=MessageResponse)
def invite_partner(
    data: InviteRequest,
    db: Session = Depends(get_db),
    token_account: Account = Depends(get_token_account),
    account: Account = Depends(get_current_account),
):
    if data.email.lower() == account.email.lower():
        raise HTTPException(400, "You can't invite yourself.")

    already_member = (
        db.query(AccountMember)
        .filter(
            AccountMember.account_id == account.id,
            AccountMember.user_email == data.email,
        )
        .first()
    )
    if already_member:
        raise HTTPException(409, "That person is already on this account.")

    token = secrets.token_urlsafe(32)
    account.invite_token = token
    account.invite_token_expires = _utcnow() + timedelta(hours=48)
    db.commit()

    send_invite_email(data.email, token, token_account.display_name)
    return MessageResponse(
        message=f"Invite sent to {data.email}.",
        debug_token=None if resend_configured() else token,
    )


def _account_for_invite(db: Session, token: str) -> Account:
    account = db.query(Account).filter(Account.invite_token == token).first()
    if (
        not account
        or not account.invite_token_expires
        or account.invite_token_expires < _utcnow()
    ):
        raise HTTPException(400, "This invite link is invalid or has expired.")
    return account


def _add_member(db: Session, shared: Account, email: str) -> None:
    exists = (
        db.query(AccountMember)
        .filter(
            AccountMember.account_id == shared.id,
            AccountMember.user_email == email,
        )
        .first()
    )
    if not exists:
        db.add(AccountMember(account_id=shared.id, user_email=email, role="member"))
    # Single-use invite.
    shared.invite_token = None
    shared.invite_token_expires = None


@router.post("/accept-invite/login", response_model=TokenResponse)
def accept_invite_login(data: AcceptInviteLogin, db: Session = Depends(get_db)):
    shared = _account_for_invite(db, data.token)

    user = db.query(Account).filter(Account.email == data.email).first()
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(401, "Invalid email or password")
    if user.id == shared.id:
        raise HTTPException(400, "You can't accept an invite to your own account.")

    _add_member(db, shared, user.email)
    db.commit()
    return TokenResponse(access_token=create_access_token(user.id))


@router.post("/accept-invite/register", response_model=TokenResponse, status_code=201)
def accept_invite_register(data: AcceptInviteRegister, db: Session = Depends(get_db)):
    shared = _account_for_invite(db, data.token)

    if db.query(Account).filter(Account.email == data.email).first():
        raise HTTPException(
            409, "An account with this email already exists. Sign in to accept instead."
        )

    account = Account(
        email=data.email,
        hashed_password=hash_password(data.password),
        display_name=data.display_name,
    )
    db.add(account)
    db.flush()

    _add_member(db, shared, account.email)
    db.commit()
    return TokenResponse(access_token=create_access_token(account.id))
