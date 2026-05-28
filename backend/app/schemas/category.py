from pydantic import BaseModel


class CategoryOut(BaseModel):
    id: int
    name: str
    color: str
    icon: str | None

    model_config = {"from_attributes": True}


class CategoryCreate(BaseModel):
    name: str
    color: str
    icon: str | None = None
