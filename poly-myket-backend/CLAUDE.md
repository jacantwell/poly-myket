# Backend — FastAPI + SQLAlchemy

## Quick Start

```bash
cd poly-myket-backend && uv sync
uv run alembic upgrade head    # creates dev.db
make backend                   # from repo root, port 6767
```

No `.env` file needed for local dev — defaults to SQLite with zero config.

## Project Layout

```
app/
├── main.py              # FastAPI app, CORS, router registration
├── config.py            # Pydantic settings (loads .env)
├── database.py          # Async SQLAlchemy engine + session factory
├── dependencies.py      # get_current_user JWT auth dependency
├── models/
│   ├── base.py          # Base class, UUID PK mixin, timestamp mixin
│   ├── user.py          # User
│   ├── group.py         # Group, GroupMember, GroupRole enum
│   ├── bet.py           # Bet, BetStatus enum
│   ├── wager.py         # Wager, WagerSide enum
│   └── credit_adjustment.py
├── schemas/             # Pydantic request/response schemas
│   ├── user.py, group.py, bet.py, wager.py
└── routers/             # Route handlers
    ├── users.py, groups.py, bets.py, wagers.py
```

Other files: `alembic/` (migrations), `api/index.py` (Vercel entrypoint), `vercel.json` (deployment routing).

## Conventions

- **Async everywhere** — all DB operations use `AsyncSession`
- **UUID primary keys** and timestamp mixins on all models (`models/base.py`)
- **Enums stored as VARCHAR** (`native_enum=False`) for SQLite/PostgreSQL compatibility
- **Credit amounts** use `Numeric(10, 2)` with `Decimal(str(...))` arithmetic
- **Dependency injection** via FastAPI `Depends` for DB sessions and auth
- **Sessions**: `expire_on_commit=False` so ORM objects stay usable after commit in async context

## Database

### Dual URL Design
- `DATABASE_URL` → async driver (`asyncpg` / `aiosqlite`) for the running app
- `DATABASE_URL_DIRECT` → sync driver (`psycopg2` / `sqlite`) for Alembic migrations

### Connection Handling
- `database.py` auto-converts `postgresql://` to `postgresql+asyncpg://`
- Strips `sslmode`/`channel_binding` params (asyncpg incompatible), converts to `ssl=True` connect_arg
- **NullPool** everywhere — no persistent connection pool (Vercel serverless)

## Migrations (Alembic)

```bash
cd poly-myket-backend
uv run alembic upgrade head                              # apply all
uv run alembic revision --autogenerate -m "description"  # create new
uv run alembic current                                   # check revision
uv run alembic downgrade -1                              # rollback one step
```

`alembic.ini` leaves `sqlalchemy.url` empty — injected at runtime from `settings.database_url_direct` in `alembic/env.py`.

## Authentication

No auth router — user registration is automatic:

1. Frontend sends `Authorization: Bearer <clerk_jwt>` on every request
2. `dependencies.py` validates JWT against Clerk JWKS via `fastapi-clerk-auth`
3. First request auto-provisions a `User` from JWT claims (`sub`, `email`, `name`)
4. Subsequent requests update stale email/display_name if claims changed

All protected endpoints receive `User` ORM object via `Depends(get_current_user)`.

## API Routes

All endpoints except `GET /` (health check) require Clerk JWT.

| Area | Routes |
|------|--------|
| Users | `GET/PATCH /users/me`, `GET /users/me/profile` |
| Groups | `POST /groups`, `POST /groups/join`, `GET /groups`, `GET /groups/{id}`, `POST /groups/{id}/adjust-credits`, `GET /groups/{id}/credit-adjustments`, `POST /groups/{id}/promote` |
| Bets | `POST /groups/{id}/bets`, `GET /groups/{id}/bets`, `GET /bets/{id}`, `POST /bets/{id}/resolve`, `POST /bets/{id}/cancel` |
| Wagers | `POST /bets/{id}/wagers` |

Error responses: `{"detail": "message"}` with status 400/403/404.

## Dependencies

Python **3.12** (`.python-version`). Key packages: `fastapi[standard]`, `sqlalchemy>=2.0`, `asyncpg`, `aiosqlite`, `alembic`, `pydantic-settings`, `fastapi-clerk-auth`.

## Testing

No tests yet. When adding: use `pytest` with `pytest-asyncio` for async tests.
