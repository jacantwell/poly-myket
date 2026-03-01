import uuid
from datetime import datetime

from pydantic import BaseModel

from app.models.group import GroupRole
from app.schemas.user import UserRead


class GroupCreate(BaseModel):
    name: str


class GroupJoin(BaseModel):
    invite_code: str


class MemberRead(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    group_id: uuid.UUID
    user_id: uuid.UUID
    credit_balance: float
    role: GroupRole
    created_at: datetime
    user: UserRead


class GroupRead(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    name: str
    invite_code: str
    created_at: datetime


class GroupDetail(GroupRead):
    members: list[MemberRead]


class CreditAdjustmentCreate(BaseModel):
    member_id: uuid.UUID
    amount: float
    reason: str | None = None


class CreditAdjustmentRead(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    member_id: uuid.UUID
    adjusted_by: uuid.UUID
    amount: float
    reason: str | None
    created_at: datetime


class PromoteMember(BaseModel):
    member_id: uuid.UUID
