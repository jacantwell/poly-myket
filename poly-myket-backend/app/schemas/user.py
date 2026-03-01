import uuid
from datetime import datetime

from pydantic import BaseModel


class UserRead(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    email: str
    display_name: str
    created_at: datetime
