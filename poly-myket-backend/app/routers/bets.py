import uuid
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.bet import BetCreate, BetRead, BetResolve

router = APIRouter(tags=["bets"])

DB = Annotated[AsyncSession, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]


@router.post("/groups/{group_id}/bets", response_model=BetRead)
async def create_bet(group_id: uuid.UUID, body: BetCreate, user: CurrentUser, db: DB):
    # TODO: create bet in group
    raise NotImplementedError


@router.get("/groups/{group_id}/bets", response_model=list[BetRead])
async def list_bets(group_id: uuid.UUID, user: CurrentUser, db: DB):
    # TODO: list bets for group
    raise NotImplementedError


@router.post("/bets/{bet_id}/resolve", response_model=BetRead)
async def resolve_bet(bet_id: uuid.UUID, body: BetResolve, user: CurrentUser, db: DB):
    # TODO: resolve bet, settle wagers
    raise NotImplementedError


@router.post("/bets/{bet_id}/cancel", response_model=BetRead)
async def cancel_bet(bet_id: uuid.UUID, user: CurrentUser, db: DB):
    # TODO: verify user is admin of the bet's group, cancel bet and refund wagers
    raise NotImplementedError
