import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel

from app.models.bet import BetStatus
from app.schemas.user import UserRead
from app.schemas.wager import WagerRead


class BetCreate(BaseModel):
    subject_id: uuid.UUID
    description: str
    deadline: datetime | None = None


class BetResolve(BaseModel):
    outcome: Literal["success", "fail"]
    proof_image_url: str | None = None


class BetRead(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    group_id: uuid.UUID
    created_by: uuid.UUID
    subject_id: uuid.UUID
    description: str
    deadline: datetime | None
    status: BetStatus
    proof_image_url: str | None
    resolved_at: datetime | None
    created_at: datetime
    creator: UserRead | None = None
    subject: UserRead | None = None
    wagers: list[WagerRead] | None = None
