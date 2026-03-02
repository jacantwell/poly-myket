import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, field_validator

from app.models.bet import BetStatus
from app.schemas.user import UserRead
from app.schemas.wager import WagerRead


class BetCreate(BaseModel):
    subject_id: uuid.UUID
    description: str
    deadline: datetime | None = None
    initial_wager_amount: float

    @field_validator("initial_wager_amount")
    @classmethod
    def wager_must_be_positive(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("Initial wager amount must be greater than 0")
        return v


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
