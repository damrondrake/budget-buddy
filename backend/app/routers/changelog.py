from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth import get_current_account
from app.models import Changelog
from app.models.account import Account
from app.schemas.changelog import ChangelogOut

router = APIRouter(prefix="/api/changelog", tags=["changelog"])


@router.get("/latest", response_model=ChangelogOut | None)
def latest_changelog(
    db: Session = Depends(get_db),
    account: Account = Depends(get_current_account),
):
    """The most recent changelog entry, or null if none exist.

    Changelogs are global (not account-scoped); auth is required only so this
    is reachable with the same session as the rest of the app.
    """
    return (
        db.query(Changelog)
        .order_by(Changelog.released_at.desc(), Changelog.id.desc())
        .first()
    )
