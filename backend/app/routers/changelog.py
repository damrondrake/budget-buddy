from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth import get_current_account
from app.models import Changelog
from app.models.account import Account
from app.schemas.changelog import ChangelogOut

router = APIRouter(prefix="/api/changelog", tags=["changelog"])


def _parse_version(value: str) -> tuple[int, ...]:
    """Parse a dotted version ('1.10.0') into a comparable tuple of ints."""
    try:
        return tuple(int(part) for part in str(value).split("."))
    except (ValueError, AttributeError):
        return (0,)


@router.get("/latest", response_model=ChangelogOut | list[ChangelogOut] | None)
def latest_changelog(
    since_version: str | None = Query(
        None, description="Return all entries newer than this version (e.g. '1.0.0')."
    ),
    db: Session = Depends(get_db),
    account: Account = Depends(get_current_account),
):
    """The What's New feed.

    - **No ``since_version``** (new users): the single latest entry, or ``null``.
    - **With ``since_version``**: every entry whose version is greater than it,
      newest first — so returning users only get updates they haven't seen yet.
      May be an empty list when the user is already current.

    Changelogs are global (not account-scoped); auth is required only so this is
    reachable with the same session as the rest of the app.
    """
    entries = db.query(Changelog).all()
    entries.sort(key=lambda e: _parse_version(e.version), reverse=True)

    if since_version is None:
        return entries[0] if entries else None

    seen = _parse_version(since_version)
    return [e for e in entries if _parse_version(e.version) > seen]
