import os
from datetime import datetime, timedelta, timezone

import bcrypt
from dotenv import load_dotenv
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.account import Account
from app.models.account_member import AccountMember

# override=False so platform-injected env vars (Railway) always win over any .env file.
load_dotenv(override=False)

SECRET_KEY = os.environ["SECRET_KEY"]
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def create_access_token(account_id: int) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode({"sub": str(account_id), "exp": expire}, SECRET_KEY, algorithm=ALGORITHM)


def get_token_account(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> Account:
    """The actual logged-in person's account, straight from the token.

    Use this when you need the caller's own identity (e.g. /me, display name).
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        account_id = int(payload.get("sub"))
    except (JWTError, TypeError, ValueError):
        raise credentials_exception

    account = db.get(Account, account_id)
    if not account:
        raise credentials_exception
    return account


def get_current_account(
    token_account: Account = Depends(get_token_account),
    db: Session = Depends(get_db),
) -> Account:
    """The account used to scope all data queries.

    If the caller has accepted an invite to share another account (their email
    appears in account_members as a member), data resolves to that shared
    account. Otherwise it's just their own account. Every data router depends on
    this, so collaboration works without changing those routers.
    """
    membership = (
        db.query(AccountMember)
        .filter(
            AccountMember.user_email == token_account.email,
            AccountMember.role == "member",
        )
        .first()
    )
    if membership:
        shared = db.get(Account, membership.account_id)
        if shared:
            return shared
    return token_account
