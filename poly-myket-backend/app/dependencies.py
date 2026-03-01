from fastapi import Depends
from fastapi_clerk_auth import ClerkConfig, ClerkHTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models.user import User

clerk_config = ClerkConfig(jwks_url=settings.clerk_jwks_url)
clerk_auth_guard = ClerkHTTPBearer(config=clerk_config)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(clerk_auth_guard),
    db: AsyncSession = Depends(get_db),
) -> User:
    claims = credentials.decoded
    clerk_id: str = claims["sub"]
    email: str = claims.get("email") or ""
    name: str = claims.get("name") or ""

    result = await db.execute(select(User).where(User.clerk_id == clerk_id))
    user = result.scalar_one_or_none()

    if user is None:
        user = User(clerk_id=clerk_id, email=email or clerk_id, display_name=name)
        db.add(user)
        await db.commit()
        await db.refresh(user)
    else:
        # Update email/name if they were missing before and are now available
        changed = False
        if email and (not user.email or user.email == user.clerk_id):
            user.email = email
            changed = True
        if name and not user.display_name:
            user.display_name = name
            changed = True
        if changed:
            await db.commit()
            await db.refresh(user)

    return user
