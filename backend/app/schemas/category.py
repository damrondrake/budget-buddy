from pydantic import BaseModel


class CategoryOut(BaseModel):
    id: int
    name: str
    color: str
    icon: str | None

    model_config = {"from_attributes": True}
