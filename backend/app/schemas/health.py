from pydantic import BaseModel


class HealthComponent(BaseModel):
    key: str
    name: str
    score: float
    max: int
    description: str


class HealthScoreOut(BaseModel):
    month: int
    year: int
    score: int
    grade: str
    tip: str
    components: list[HealthComponent]


class HealthScorePoint(BaseModel):
    month: int
    year: int
    label: str
    score: int
    grade: str


class HealthScoreHistoryOut(BaseModel):
    points: list[HealthScorePoint]
