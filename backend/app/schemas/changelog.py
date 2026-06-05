from datetime import date as date_type

from pydantic import BaseModel


class ChangelogOut(BaseModel):
    id: int
    version: str
    title: str
    items: list[str]
    released_at: date_type

    model_config = {"from_attributes": True}
