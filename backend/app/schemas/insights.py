from datetime import datetime

from pydantic import BaseModel


class Insight(BaseModel):
    title: str
    body: str
    type: str  # 'positive' | 'warning' | 'tip' | 'neutral'
    icon: str  # emoji


class InsightsOut(BaseModel):
    month: int
    year: int
    # False when ANTHROPIC_API_KEY isn't set and there's no cached result —
    # the frontend shows a "coming soon" placeholder in that case.
    configured: bool
    cached: bool
    generated_at: datetime | None = None
    insights: list[Insight]
