import uuid
from datetime import datetime

from pydantic import BaseModel


class UserRead(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    email: str
    display_name: str
    image_url: str | None = None
    created_at: datetime


class UserUpdate(BaseModel):
    image_url: str | None = None
