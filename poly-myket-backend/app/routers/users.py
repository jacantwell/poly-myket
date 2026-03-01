from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.user import UserRead, UserUpdate

router = APIRouter(prefix="/users", tags=["users"])

CurrentUser = Annotated[User, Depends(get_current_user)]


@router.get("/me", response_model=UserRead)
async def get_me(user: CurrentUser):
    return user


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
