import uuid
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.wager import WagerCreate, WagerRead

router = APIRouter(tags=["wagers"])

DB = Annotated[AsyncSession, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]


@router.post("/bets/{bet_id}/wagers", response_model=WagerRead)
async def create_wager(bet_id: uuid.UUID, body: WagerCreate, user: CurrentUser, db: DB):
    # TODO: create wager on bet
    raise NotImplementedError
