import ssl
from collections.abc import AsyncGenerator
from urllib.parse import parse_qs, urlencode, urlsplit, urlunsplit

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from app.config import settings


def _make_engine():
    url = settings.database_url

    # asyncpg doesn't understand sslmode/channel_binding query params —
    # strip them and pass ssl=True via connect_args instead.
    connect_args: dict = {}
    if "+asyncpg" in url:
        parts = urlsplit(url)
        params = parse_qs(parts.query)
        needs_ssl = params.pop("sslmode", [None])[0] in ("require", "verify-ca", "verify-full")
        params.pop("channel_binding", None)
        cleaned_query = urlencode({k: v[0] for k, v in params.items()})
        url = urlunsplit(parts._replace(query=cleaned_query))
        if needs_ssl:
            connect_args["ssl"] = ssl.create_default_context()

    return create_async_engine(url, poolclass=NullPool, connect_args=connect_args)


engine = _make_engine()
async_session = async_sessionmaker(engine, expire_on_commit=False)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session() as session:
        yield session
