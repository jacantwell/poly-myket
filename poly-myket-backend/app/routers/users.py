from typing import Annotated

from fastapi import APIRouter, Depends

from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.user import UserRead

router = APIRouter(prefix="/users", tags=["users"])

CurrentUser = Annotated[User, Depends(get_current_user)]


@router.get("/me", response_model=UserRead)
async def get_me(user: CurrentUser):
    return user
