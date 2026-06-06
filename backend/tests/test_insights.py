"""AI insights tests.

These never hit the Anthropic API: the test environment has no
ANTHROPIC_API_KEY, and the generation path is monkeypatched where exercised.
"""
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models import Account, InsightsCache
from app.routers import insights as insights_module
from app.routers.insights import Insight, _parse_insights


def _account(db_engine) -> Account:
    with Session(db_engine) as s:
        return s.query(Account).first()


def test_placeholder_when_unconfigured(client, auth):
    # No ANTHROPIC_API_KEY in the test env, no cache → placeholder.
    res = client.get("/api/insights", headers=auth.headers, params={"month": 6, "year": 2026})
    assert res.status_code == 200
    body = res.json()
    assert body["configured"] is False
    assert body["insights"] == []


def test_requires_auth(client):
    assert client.get("/api/insights").status_code == 401


def test_returns_cached_insights(client, auth, db_engine):
    acct = _account(db_engine)
    rows = [{"title": "Nice saving", "body": "You saved 20%.", "type": "positive", "icon": "🎉"}]
    with Session(db_engine) as s:
        s.add(InsightsCache(
            account_id=acct.id, month=6, year=2026, insights=rows,
            generated_at=datetime.now(timezone.utc),
        ))
        s.commit()

    res = client.get("/api/insights", headers=auth.headers, params={"month": 6, "year": 2026})
    assert res.status_code == 200
    body = res.json()
    assert body["cached"] is True
    assert body["configured"] is True
    assert body["insights"][0]["title"] == "Nice saving"
    assert body["insights"][0]["type"] == "positive"


def test_generates_and_caches(client, auth, db_engine, monkeypatch):
    # Pretend the API is configured, and stub the model call.
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-test-xxx")
    fake = [
        Insight(title="Watch dining", body="Dining is up 30%.", type="warning", icon="🍽️"),
        Insight(title="Goal on track", body="Trip fund at 60%.", type="tip", icon="✈️"),
    ]
    monkeypatch.setattr(insights_module, "_generate", lambda context: fake)

    res = client.get("/api/insights", headers=auth.headers, params={"month": 6, "year": 2026})
    assert res.status_code == 200
    body = res.json()
    assert body["configured"] is True
    assert body["cached"] is False
    assert len(body["insights"]) == 2

    # A cache row was written and a subsequent call serves it.
    with Session(db_engine) as s:
        assert s.query(InsightsCache).filter_by(account_id=_account(db_engine).id).count() == 1

    res2 = client.get("/api/insights", headers=auth.headers, params={"month": 6, "year": 2026})
    assert res2.json()["cached"] is True


def test_refresh_bypasses_cache(client, auth, db_engine, monkeypatch):
    acct = _account(db_engine)
    with Session(db_engine) as s:
        s.add(InsightsCache(
            account_id=acct.id, month=6, year=2026,
            insights=[{"title": "Old", "body": "Stale.", "type": "neutral", "icon": "📊"}],
            generated_at=datetime.now(timezone.utc),
        ))
        s.commit()

    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-test-xxx")
    monkeypatch.setattr(
        insights_module, "_generate",
        lambda context: [Insight(title="Fresh", body="New.", type="positive", icon="✨")],
    )

    res = client.get("/api/insights", headers=auth.headers, params={"month": 6, "year": 2026, "refresh": "true"})
    body = res.json()
    assert body["cached"] is False
    assert body["insights"][0]["title"] == "Fresh"


def test_parse_strips_code_fences_and_validates_type():
    text = """```json
[
  {"title": "Good", "body": "Nice.", "type": "positive", "icon": "🎉"},
  {"title": "Odd", "body": "Hmm.", "type": "bogus", "icon": "🤔"}
]
```"""
    parsed = _parse_insights(text)
    assert len(parsed) == 2
    assert parsed[0].type == "positive"
    # Unknown type coerced to 'neutral'.
    assert parsed[1].type == "neutral"


def test_parse_extracts_array_from_surrounding_text():
    text = 'Here are your insights: [{"title": "T", "body": "B", "type": "tip", "icon": "💡"}] Hope that helps!'
    parsed = _parse_insights(text)
    assert len(parsed) == 1
    assert parsed[0].title == "T"
