import uuid
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from unittest.mock import MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.database import get_db
from app.dependencies import get_current_user
from app.main import app
from app.models import Base, Group, GroupMember, GroupRole, User


@pytest.fixture
async def engine():
    """In-memory SQLite engine — tables created/dropped per test."""
    eng = create_async_engine("sqlite+aiosqlite://", echo=False)
    async with eng.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield eng
    async with eng.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await eng.dispose()


@pytest.fixture
async def db_session(engine) -> AsyncGenerator[AsyncSession, None]:
    """Async session bound to the in-memory engine."""
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with session_factory() as session:
        yield session


@pytest.fixture
async def test_user(db_session: AsyncSession) -> User:
    """Default authenticated user."""
    user = User(
        id=uuid.uuid4(),
        clerk_id="clerk_test_user_1",
        email="testuser@example.com",
        display_name="Test User",
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.fixture
async def second_user(db_session: AsyncSession) -> User:
    """A second user for multi-user scenarios."""
    user = User(
        id=uuid.uuid4(),
        clerk_id="clerk_test_user_2",
        email="seconduser@example.com",
        display_name="Second User",
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.fixture
async def third_user(db_session: AsyncSession) -> User:
    """A third user for multi-user scenarios."""
    user = User(
        id=uuid.uuid4(),
        clerk_id="clerk_test_user_3",
        email="thirduser@example.com",
        display_name="Third User",
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.fixture
async def test_group(db_session: AsyncSession, test_user: User) -> Group:
    """Group with test_user as admin and 100 starting credits."""
    group = Group(
        id=uuid.uuid4(),
        name="Test Group",
        invite_code="TESTCODE",
        starting_credits=100,
    )
    db_session.add(group)
    await db_session.flush()

    member = GroupMember(
        id=uuid.uuid4(),
        group_id=group.id,
        user_id=test_user.id,
        role=GroupRole.ADMIN,
        credit_balance=100,
    )
    db_session.add(member)
    await db_session.commit()
    await db_session.refresh(group)
    return group


@pytest.fixture
async def client(db_session: AsyncSession, test_user: User) -> AsyncGenerator[AsyncClient, None]:
    """httpx AsyncClient with get_db and get_current_user overridden."""

    async def _override_db():
        yield db_session

    def _override_user():
        return test_user

    app.dependency_overrides[get_db] = _override_db
    app.dependency_overrides[get_current_user] = _override_user

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest.fixture
def client_factory(db_session: AsyncSession):
    """Factory to create clients authenticated as any user."""

    @asynccontextmanager
    async def _make_client(user: User):
        prev_overrides = dict(app.dependency_overrides)

        async def _override_db():
            yield db_session

        def _override_user():
            return user

        app.dependency_overrides[get_db] = _override_db
        app.dependency_overrides[get_current_user] = _override_user

        async with AsyncClient(
            transport=ASGITransport(app=app),
            base_url="http://test",
        ) as ac:
            yield ac

        app.dependency_overrides.clear()
        app.dependency_overrides.update(prev_overrides)

    return _make_client


@pytest.fixture(autouse=True)
def mock_resend():
    """Globally mock resend to prevent real email sends."""
    with (
        patch("app.services.email.resend") as mock,
        patch("app.services.email._is_enabled", return_value=True),
    ):
        mock.Batch = MagicMock()
        mock.Emails = MagicMock()
        yield mock
