import uuid
from datetime import UTC, datetime
from decimal import Decimal
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.dependencies import get_current_user
from app.models.bet import Bet, BetStatus
from app.models.group import Group, GroupMember, GroupRole
from app.models.user import User
from app.models.wager import Wager, WagerSide
from app.schemas.bet import BetCreate, BetRead, BetResolve
from app.services.email import send_bet_created_emails, send_bet_resolved_emails

router = APIRouter(tags=["bets"])

DB = Annotated[AsyncSession, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]


async def _get_membership(
    db: AsyncSession, user_id: uuid.UUID, group_id: uuid.UUID, *, require_admin: bool = False
) -> GroupMember:
    result = await db.execute(
        select(GroupMember).where(
            and_(GroupMember.group_id == group_id, GroupMember.user_id == user_id)
        )
    )
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=403, detail="Not a member of this group")
    if require_admin and member.role != GroupRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin role required")
    return member


@router.post("/groups/{group_id}/bets", response_model=BetRead)
async def create_bet(group_id: uuid.UUID, body: BetCreate, user: CurrentUser, db: DB):
    # Self-bet enforcement: subject must be the current user
    if body.subject_id != user.id:
        raise HTTPException(status_code=400, detail="Bets must be about yourself")

    member = await _get_membership(db, user.id, group_id)

    # Validate initial wager against balance
    wager_amount = Decimal(str(body.initial_wager_amount))
    if wager_amount > Decimal(str(member.credit_balance)):
        raise HTTPException(status_code=400, detail="Insufficient credits")

    # Deduct credits
    member.credit_balance = Decimal(str(member.credit_balance)) - wager_amount

    # Create bet
    bet = Bet(
        group_id=group_id,
        created_by=user.id,
        subject_id=body.subject_id,
        description=body.description,
        deadline=body.deadline,
    )
    db.add(bet)
    await db.flush()

    # Create initial YES wager atomically
    wager = Wager(
        bet_id=bet.id,
        user_id=user.id,
        amount=body.initial_wager_amount,
        side=WagerSide.YES,
    )
    db.add(wager)
    await db.flush()

    # Reload with relationships
    result = await db.execute(
        select(Bet)
        .options(
            selectinload(Bet.creator),
            selectinload(Bet.subject),
            selectinload(Bet.wagers).selectinload(Wager.user),
        )
        .where(Bet.id == bet.id)
    )
    bet = result.scalar_one()
    await db.commit()

    # Send email notifications
    group = await db.get(Group, group_id)
    members_result = await db.execute(
        select(GroupMember)
        .options(selectinload(GroupMember.user))
        .where(GroupMember.group_id == group_id)
    )
    members_with_users = members_result.scalars().all()
    send_bet_created_emails(bet, user, group, list(members_with_users))

    return bet


@router.get("/groups/{group_id}/bets", response_model=list[BetRead])
async def list_bets(group_id: uuid.UUID, user: CurrentUser, db: DB):
    await _get_membership(db, user.id, group_id)

    result = await db.execute(
        select(Bet)
        .options(
            selectinload(Bet.creator),
            selectinload(Bet.subject),
            selectinload(Bet.wagers).selectinload(Wager.user),
        )
        .where(Bet.group_id == group_id)
        .order_by(Bet.created_at.desc())
    )
    return result.scalars().all()


@router.get("/bets/{bet_id}", response_model=BetRead)
async def get_bet(bet_id: uuid.UUID, user: CurrentUser, db: DB):
    result = await db.execute(
        select(Bet)
        .options(
            selectinload(Bet.creator),
            selectinload(Bet.subject),
            selectinload(Bet.wagers).selectinload(Wager.user),
        )
        .where(Bet.id == bet_id)
    )
    bet = result.scalar_one_or_none()
    if not bet:
        raise HTTPException(status_code=404, detail="Bet not found")

    await _get_membership(db, user.id, bet.group_id)
    return bet


@router.post("/bets/{bet_id}/resolve", response_model=BetRead)
async def resolve_bet(bet_id: uuid.UUID, body: BetResolve, user: CurrentUser, db: DB):
    result = await db.execute(
        select(Bet)
        .options(selectinload(Bet.wagers))
        .where(Bet.id == bet_id)
    )
    bet = result.scalar_one_or_none()
    if not bet:
        raise HTTPException(status_code=404, detail="Bet not found")

    if bet.status != BetStatus.OPEN:
        raise HTTPException(status_code=400, detail="Bet is not open")

    member = await _get_membership(db, user.id, bet.group_id)
    if bet.created_by != user.id and member.role != GroupRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only the bet creator or a group admin can resolve")

    # Update bet status
    bet.status = BetStatus.RESOLVED_SUCCESS if body.outcome == "success" else BetStatus.RESOLVED_FAIL
    bet.proof_image_url = body.proof_image_url
    bet.resolved_at = datetime.now(UTC)

    # Settlement
    winning_side = WagerSide.YES if body.outcome == "success" else WagerSide.NO
    total_pool = sum(Decimal(str(w.amount)) for w in bet.wagers)
    winning_wagers = [w for w in bet.wagers if w.side == winning_side]
    total_winning = sum(Decimal(str(w.amount)) for w in winning_wagers)

    payouts: dict[str, Decimal] = {}
    if total_pool > 0:
        if total_winning > 0:
            # Distribute pool proportionally to winners
            for wager in winning_wagers:
                payout = (Decimal(str(wager.amount)) / total_winning) * total_pool
                payouts[str(wager.user_id)] = payouts.get(str(wager.user_id), Decimal("0")) + payout
                wager_member_result = await db.execute(
                    select(GroupMember).where(
                        and_(
                            GroupMember.group_id == bet.group_id,
                            GroupMember.user_id == wager.user_id,
                        )
                    )
                )
                wager_member = wager_member_result.scalar_one()
                wager_member.credit_balance = Decimal(str(wager_member.credit_balance)) + payout
        else:
            # No winners — refund all wagers
            for wager in bet.wagers:
                wager_member_result = await db.execute(
                    select(GroupMember).where(
                        and_(
                            GroupMember.group_id == bet.group_id,
                            GroupMember.user_id == wager.user_id,
                        )
                    )
                )
                wager_member = wager_member_result.scalar_one()
                wager_member.credit_balance = Decimal(str(wager_member.credit_balance)) + Decimal(str(wager.amount))

    await db.flush()

    # Reload with relationships
    result = await db.execute(
        select(Bet)
        .options(
            selectinload(Bet.creator),
            selectinload(Bet.subject),
            selectinload(Bet.wagers).selectinload(Wager.user),
        )
        .where(Bet.id == bet.id)
    )
    bet = result.scalar_one()
    await db.commit()

    # Send email notifications
    group = await db.get(Group, bet.group_id)
    send_bet_resolved_emails(bet, group, list(bet.wagers), winning_side.value, payouts)

    return bet


@router.post("/bets/{bet_id}/cancel", response_model=BetRead)
async def cancel_bet(bet_id: uuid.UUID, user: CurrentUser, db: DB):
    result = await db.execute(
        select(Bet)
        .options(selectinload(Bet.wagers))
        .where(Bet.id == bet_id)
    )
    bet = result.scalar_one_or_none()
    if not bet:
        raise HTTPException(status_code=404, detail="Bet not found")

    if bet.status != BetStatus.OPEN:
        raise HTTPException(status_code=400, detail="Bet is not open")

    member = await _get_membership(db, user.id, bet.group_id)
    if bet.created_by != user.id and member.role != GroupRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only the bet creator or a group admin can cancel")

    bet.status = BetStatus.CANCELLED

    # Refund all wagers
    for wager in bet.wagers:
        wager_member_result = await db.execute(
            select(GroupMember).where(
                and_(
                    GroupMember.group_id == bet.group_id,
                    GroupMember.user_id == wager.user_id,
                )
            )
        )
        wager_member = wager_member_result.scalar_one()
        wager_member.credit_balance = Decimal(str(wager_member.credit_balance)) + Decimal(str(wager.amount))

    await db.flush()

    # Reload with relationships
    result = await db.execute(
        select(Bet)
        .options(
            selectinload(Bet.creator),
            selectinload(Bet.subject),
            selectinload(Bet.wagers).selectinload(Wager.user),
        )
        .where(Bet.id == bet.id)
    )
    bet = result.scalar_one()
    await db.commit()
    return bet
