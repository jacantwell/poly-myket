"""Tests for the get_current_user dependency (auto-provisioning and stale-data updates)."""

import uuid
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user
from app.models.user import User


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_credentials(
    clerk_id: str = "clerk_new_user",
    email: str = "new@example.com",
    name: str = "New User",
) -> SimpleNamespace:
    """Build a mock HTTPAuthorizationCredentials with decoded JWT claims."""
    return SimpleNamespace(
        decoded={"sub": clerk_id, "email": email, "name": name}
    )


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


async def test_auto_provisions_new_user(db_session: AsyncSession):
    """A previously unseen clerk_id creates a new User from JWT claims."""
    credentials = _make_credentials(
        clerk_id="clerk_brand_new",
        email="brand_new@example.com",
        name="Brand New",
    )

    user = await get_current_user(credentials=credentials, db=db_session)

    assert user is not None, "should return a User object"
    assert user.clerk_id == "clerk_brand_new", (
        "clerk_id should match JWT sub"
    )
    assert user.email == "brand_new@example.com", (
        "email should come from JWT claims"
    )
    assert user.display_name == "Brand New", (
        "display_name should come from JWT name claim"
    )

    # Verify it actually persisted in the database
    result = await db_session.execute(
        select(User).where(User.clerk_id == "clerk_brand_new")
    )
    db_user = result.scalar_one_or_none()
    assert db_user is not None, "user should be persisted in the database"
    assert db_user.id == user.id, (
        "returned user should match persisted user"
    )


async def test_returns_existing_user(
    db_session: AsyncSession, test_user: User
):
    """When the clerk_id already exists, return the existing User unchanged."""
    credentials = _make_credentials(
        clerk_id=test_user.clerk_id,
        email=test_user.email,
        name=test_user.display_name,
    )

    user = await get_current_user(credentials=credentials, db=db_session)

    assert user.id == test_user.id, "should return the same user row"
    assert user.email == "testuser@example.com", (
        "email should remain the same"
    )
    assert user.display_name == "Test User", (
        "display_name should remain the same"
    )


async def test_updates_stale_email(db_session: AsyncSession):
    """When an existing user's email equals their clerk_id (placeholder),
    a JWT with a real email should update it."""
    # Pre-create user with placeholder email (email == clerk_id)
    placeholder_user = User(
        id=uuid.uuid4(),
        clerk_id="clerk_stale_email",
        email="clerk_stale_email",
        display_name="Has Name",
    )
    db_session.add(placeholder_user)
    await db_session.commit()
    await db_session.refresh(placeholder_user)

    credentials = _make_credentials(
        clerk_id="clerk_stale_email",
        email="real@example.com",
        name="Has Name",
    )

    user = await get_current_user(credentials=credentials, db=db_session)

    assert user.id == placeholder_user.id, (
        "should return the same user row"
    )
    assert user.email == "real@example.com", (
        "email should be updated from JWT claims"
    )


async def test_updates_stale_name(db_session: AsyncSession):
    """When an existing user's display_name is empty, a JWT with a name
    should backfill it."""
    # Pre-create user with empty display_name
    nameless_user = User(
        id=uuid.uuid4(),
        clerk_id="clerk_stale_name",
        email="nameless@example.com",
        display_name="",
    )
    db_session.add(nameless_user)
    await db_session.commit()
    await db_session.refresh(nameless_user)

    credentials = _make_credentials(
        clerk_id="clerk_stale_name",
        email="nameless@example.com",
        name="Now Has Name",
    )

    user = await get_current_user(credentials=credentials, db=db_session)

    assert user.id == nameless_user.id, "should return the same user row"
    assert user.display_name == "Now Has Name", (
        "display_name should be updated from JWT claims"
    )


async def test_integrity_error_race_condition(db_session: AsyncSession):
    """When two concurrent requests try to create the same user, the loser
    (IntegrityError on commit) should rollback and re-query the winner.

    Strategy: pre-insert the "winning" user, then patch the first SELECT
    to return None (simulating a narrow race window where the initial
    lookup misses the row). The subsequent INSERT + commit will raise a
    real IntegrityError from the unique constraint. After rollback the
    function re-queries and finds the winning user.
    """
    clerk_id = "clerk_race_condition"
    email = "racer@example.com"

    # Pre-insert the "winning" user that the concurrent request created.
    winning_user = User(
        id=uuid.uuid4(),
        clerk_id=clerk_id,
        email=email,
        display_name="Racer",
    )
    db_session.add(winning_user)
    await db_session.commit()
    await db_session.refresh(winning_user)

    credentials = _make_credentials(
        clerk_id=clerk_id,
        email=email,
        name="Racer",
    )

    # Patch the first db.execute call so the initial SELECT returns None,
    # simulating the narrow window where the row hasn't been committed yet
    # by the other request. Subsequent execute calls (the re-query after
    # rollback) pass through to the real session.
    original_execute = db_session.execute
    execute_call_count = 0

    async def _execute_side_effect(*args, **kwargs):
        nonlocal execute_call_count
        execute_call_count += 1
        if execute_call_count == 1:
            # Return a mock result whose scalar_one_or_none() returns None
            mock_result = MagicMock()
            mock_result.scalar_one_or_none.return_value = None
            return mock_result
        # All subsequent calls go to the real session
        return await original_execute(*args, **kwargs)

    with patch.object(
        db_session, "execute", side_effect=_execute_side_effect
    ):
        user = await get_current_user(
            credentials=credentials, db=db_session
        )

    assert user is not None, (
        "should return a user even after IntegrityError"
    )
    assert user.clerk_id == clerk_id, "should find the pre-existing user"
    assert user.id == winning_user.id, (
        "should return the user that won the race"
    )
