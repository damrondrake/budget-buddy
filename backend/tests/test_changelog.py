from datetime import date

from sqlalchemy.orm import Session

from app.models import Changelog


def _seed(db_engine, version, items):
    with Session(db_engine) as s:
        s.add(Changelog(version=version, title=f"v{version}", items=items, released_at=date(2026, 6, 4)))
        s.commit()


def test_empty_changelog_returns_null(client, auth):
    assert client.get("/api/changelog/latest", headers=auth.headers).json() is None


def test_no_param_returns_single_latest_entry(client, auth, db_engine):
    _seed(db_engine, "1.0.0", ["launch"])
    _seed(db_engine, "1.1.0", ["update"])
    res = client.get("/api/changelog/latest", headers=auth.headers).json()
    assert isinstance(res, dict)
    assert res["version"] == "1.1.0"


def test_since_version_returns_only_newer_entries(client, auth, db_engine):
    _seed(db_engine, "1.0.0", ["launch"])
    _seed(db_engine, "1.1.0", ["update"])
    res = client.get("/api/changelog/latest", headers=auth.headers, params={"since_version": "1.0.0"}).json()
    assert isinstance(res, list)
    assert [e["version"] for e in res] == ["1.1.0"]


def test_since_current_version_returns_empty_list(client, auth, db_engine):
    _seed(db_engine, "1.0.0", ["launch"])
    _seed(db_engine, "1.1.0", ["update"])
    res = client.get("/api/changelog/latest", headers=auth.headers, params={"since_version": "1.1.0"}).json()
    assert res == []


def test_returns_all_unseen_newest_first(client, auth, db_engine):
    _seed(db_engine, "1.0.0", ["launch"])
    _seed(db_engine, "1.1.0", ["update"])
    res = client.get("/api/changelog/latest", headers=auth.headers, params={"since_version": "0.9.0"}).json()
    assert [e["version"] for e in res] == ["1.1.0", "1.0.0"]


def test_version_comparison_is_semver_aware(client, auth, db_engine):
    # String comparison would rank "1.9.0" above "1.10.0"; numeric must not.
    _seed(db_engine, "1.9.0", ["nine"])
    _seed(db_engine, "1.10.0", ["ten"])
    newer = client.get("/api/changelog/latest", headers=auth.headers, params={"since_version": "1.9.0"}).json()
    assert [e["version"] for e in newer] == ["1.10.0"]
    latest = client.get("/api/changelog/latest", headers=auth.headers).json()
    assert latest["version"] == "1.10.0"
