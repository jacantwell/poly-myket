import uuid
from datetime import datetime

from pydantic import BaseModel

from app.models.wager import WagerSide
from app.schemas.user import UserRead


class WagerCreate(BaseModel):
    amount: float
    side: WagerSide


class WagerRead(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    bet_id: uuid.UUID
    user_id: uuid.UUID
    amount: float
    side: WagerSide
    created_at: datetime
    user: UserRead | None = None
