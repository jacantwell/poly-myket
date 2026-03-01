import secrets
import string
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.dependencies import get_current_user
from app.models.group import Group, GroupMember, GroupRole
from app.models.user import User
from app.schemas.group import (
    CreditAdjustmentCreate,
    CreditAdjustmentRead,
    GroupCreate,
    GroupDetail,
    GroupJoin,
    GroupRead,
    MemberRead,
    PromoteMember,
)

router = APIRouter(prefix="/groups", tags=["groups"])

DB = Annotated[AsyncSession, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]

INVITE_CODE_CHARS = string.ascii_letters + string.digits
INVITE_CODE_LENGTH = 8


def _generate_invite_code() -> str:
    return "".join(secrets.choice(INVITE_CODE_CHARS) for _ in range(INVITE_CODE_LENGTH))


@router.post("", response_model=GroupRead)
async def create_group(body: GroupCreate, user: CurrentUser, db: DB):
    group = Group(name=body.name, invite_code=_generate_invite_code())
    db.add(group)
    await db.flush()

    member = GroupMember(group_id=group.id, user_id=user.id, role=GroupRole.ADMIN)
    db.add(member)
    await db.commit()
    await db.refresh(group)
    return group


@router.post("/join", response_model=GroupRead)
async def join_group(body: GroupJoin, user: CurrentUser, db: DB):
    result = await db.execute(select(Group).where(Group.invite_code == body.invite_code))
    group = result.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=404, detail="Invalid invite code")

    existing = await db.execute(
        select(GroupMember).where(
            and_(GroupMember.group_id == group.id, GroupMember.user_id == user.id)
        )
    )
    if existing.scalar_one_or_none():
        return group

    member = GroupMember(group_id=group.id, user_id=user.id, role=GroupRole.MEMBER)
    db.add(member)
    await db.commit()
    return group


@router.get("", response_model=list[GroupRead])
async def list_groups(user: CurrentUser, db: DB):
    result = await db.execute(
        select(Group)
        .join(GroupMember, GroupMember.group_id == Group.id)
        .where(GroupMember.user_id == user.id)
    )
    return result.scalars().all()


@router.get("/{group_id}", response_model=GroupDetail)
async def get_group(group_id: uuid.UUID, user: CurrentUser, db: DB):
    result = await db.execute(
        select(Group)
        .options(selectinload(Group.members).selectinload(GroupMember.user))
        .where(Group.id == group_id)
    )
    group = result.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    is_member = any(m.user_id == user.id for m in group.members)
    if not is_member:
        raise HTTPException(status_code=403, detail="Not a member of this group")

    return group


@router.post("/{group_id}/adjust-credits", response_model=CreditAdjustmentRead)
async def adjust_credits(
    group_id: uuid.UUID, body: CreditAdjustmentCreate, user: CurrentUser, db: DB
):
    # TODO: verify user is admin of group, create credit adjustment, update member balance
    raise NotImplementedError


@router.get("/{group_id}/credit-adjustments", response_model=list[CreditAdjustmentRead])
async def list_credit_adjustments(group_id: uuid.UUID, user: CurrentUser, db: DB):
    # TODO: verify user is member of group, return credit adjustments
    raise NotImplementedError


@router.post("/{group_id}/promote", response_model=MemberRead)
async def promote_member(
    group_id: uuid.UUID, body: PromoteMember, user: CurrentUser, db: DB
):
    # TODO: verify user is admin of group, promote target member to admin
    raise NotImplementedError
