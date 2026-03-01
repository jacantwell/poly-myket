import uuid
from datetime import datetime

from pydantic import BaseModel

from app.models.bet import BetStatus
from app.models.group import GroupRole
from app.models.wager import WagerSide


class UserRead(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    email: str
    display_name: str
    image_url: str | None = None
    created_at: datetime


class UserUpdate(BaseModel):
    image_url: str | None = None


class ProfileMembership(BaseModel):
    id: uuid.UUID
    group_id: uuid.UUID
    group_name: str
    credit_balance: float
    role: GroupRole


class ProfileBet(BaseModel):
    id: uuid.UUID
    group_id: uuid.UUID
    group_name: str
    description: str
    status: BetStatus
    resolved_at: datetime | None = None


class ProfileWager(BaseModel):
    id: uuid.UUID
    bet_id: uuid.UUID
    amount: float
    side: WagerSide
    created_at: datetime
    bet: ProfileBet


class UserProfile(BaseModel):
    user: UserRead
    memberships: list[ProfileMembership]
    wagers: list[ProfileWager]
