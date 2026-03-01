import uuid
from decimal import Decimal
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.dependencies import get_current_user
from app.models.bet import Bet, BetStatus
from app.models.group import GroupMember
from app.models.user import User
from app.models.wager import Wager
from app.schemas.wager import WagerCreate, WagerRead

router = APIRouter(tags=["wagers"])

DB = Annotated[AsyncSession, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]


@router.post("/bets/{bet_id}/wagers", response_model=WagerRead)
async def create_wager(bet_id: uuid.UUID, body: WagerCreate, user: CurrentUser, db: DB):
    # Fetch the bet
    result = await db.execute(select(Bet).where(Bet.id == bet_id))
    bet = result.scalar_one_or_none()
    if not bet:
        raise HTTPException(status_code=404, detail="Bet not found")

    if bet.status != BetStatus.OPEN:
        raise HTTPException(status_code=400, detail="Bet is not open")

    # Verify user is a member of the bet's group
    member_result = await db.execute(
        select(GroupMember).where(
            and_(GroupMember.group_id == bet.group_id, GroupMember.user_id == user.id)
        )
    )
    member = member_result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=403, detail="Not a member of this group")

    if body.amount <= 0:
        raise HTTPException(status_code=400, detail="Wager amount must be positive")

    if Decimal(str(body.amount)) > Decimal(str(member.credit_balance)):
        raise HTTPException(status_code=400, detail="Insufficient credits")

    # Deduct credits
    member.credit_balance = Decimal(str(member.credit_balance)) - Decimal(str(body.amount))

    # Create wager
    wager = Wager(bet_id=bet_id, user_id=user.id, amount=body.amount, side=body.side)
    db.add(wager)
    await db.flush()

    # Reload with user relationship
    result = await db.execute(
        select(Wager).options(selectinload(Wager.user)).where(Wager.id == wager.id)
    )
    wager = result.scalar_one()
    await db.commit()
    return wager
