from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.dependencies import get_current_user
from app.models.bet import Bet
from app.models.group import GroupMember
from app.models.user import User
from app.models.wager import Wager
from app.schemas.user import (
    ProfileBet,
    ProfileMembership,
    ProfileWager,
    UserProfile,
    UserRead,
    UserUpdate,
)

router = APIRouter(prefix="/users", tags=["users"])

CurrentUser = Annotated[User, Depends(get_current_user)]


@router.get("/me", response_model=UserRead)
async def get_me(user: CurrentUser):
    return user


@router.get("/me/profile", response_model=UserProfile)
async def get_my_profile(
    user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    memberships_result = await db.execute(
        select(GroupMember)
        .where(GroupMember.user_id == user.id)
        .options(selectinload(GroupMember.group))
    )
    memberships = memberships_result.scalars().all()

    wagers_result = await db.execute(
        select(Wager)
        .where(Wager.user_id == user.id)
        .options(selectinload(Wager.bet).selectinload(Bet.group))
        .order_by(Wager.created_at.desc())
    )
    wagers = wagers_result.scalars().all()

    return UserProfile(
        user=UserRead.model_validate(user),
        memberships=[
            ProfileMembership(
                id=m.id,
                group_id=m.group_id,
                group_name=m.group.name,
                credit_balance=m.credit_balance,
                role=m.role,
            )
            for m in memberships
        ],
        wagers=[
            ProfileWager(
                id=w.id,
                bet_id=w.bet_id,
                amount=w.amount,
                side=w.side,
                created_at=w.created_at,
                bet=ProfileBet(
                    id=w.bet.id,
                    group_id=w.bet.group_id,
                    group_name=w.bet.group.name,
                    description=w.bet.description,
                    status=w.bet.status,
                    resolved_at=w.bet.resolved_at,
                ),
            )
            for w in wagers
        ],
    )


@router.patch("/me", response_model=UserRead)
async def update_me(
    body: UserUpdate,
    user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    if body.image_url is not None:
        user.image_url = body.image_url
    await db.commit()
    await db.refresh(user)
    return user
