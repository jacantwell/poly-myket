# Poly-Myket Backend

FastAPI backend for Poly-Myket — a social betting app where friends bet on each other's real-life commitments using credits.

## Quick Start

```bash
# From repo root
cd poly-myket-backend

# Install dependencies
uv sync

# Apply migrations (creates dev.db)
uv run alembic upgrade head

# Start dev server (port 6767, hot reload)
# From repo root:
make backend
```

The API will be available at `http://localhost:6767`. Health check: `GET /` returns `{"status": "ok"}`.

## Environment Variables

Copy `.env.example` to `.env`:

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `sqlite+aiosqlite:///./dev.db` | Async DB URL for the app. PostgreSQL URLs are auto-rewritten to use `asyncpg`. |
| `DATABASE_URL_DIRECT` | `sqlite:///./dev.db` | Sync DB URL used only by Alembic migrations. |
| `CLERK_JWKS_URL` | `""` | Clerk JWKS endpoint for JWT verification. |
| `FRONTEND_URL` | `http://localhost:3000` | Allowed CORS origin. |

For local development, no `.env` file is needed — defaults use SQLite with zero config.

## Project Layout

```
app/
├── main.py              # FastAPI app, CORS middleware, router registration
├── config.py            # Pydantic settings (loads .env)
├── database.py          # Async SQLAlchemy engine + session factory
├── dependencies.py      # get_current_user JWT auth dependency
├── models/
│   ├── base.py          # Base class, UUID PK mixin, timestamp mixin
│   ├── user.py          # User
│   ├── group.py         # Group, GroupMember, GroupRole enum
│   ├── bet.py           # Bet, BetStatus enum
│   ├── wager.py         # Wager, WagerSide enum
│   └── credit_adjustment.py  # CreditAdjustment
├── schemas/
│   ├── user.py          # UserRead, UserUpdate, UserProfile, etc.
│   ├── group.py         # GroupCreate, GroupRead, GroupDetail, MemberRead, etc.
│   ├── bet.py           # BetCreate, BetResolve, BetRead
│   └── wager.py         # WagerCreate, WagerRead
└── routers/
    ├── users.py         # /users/*
    ├── groups.py        # /groups/*
    ├── bets.py          # /groups/{id}/bets, /bets/{id}/*
    └── wagers.py        # /bets/{id}/wagers
```

Other files:

| Path | Purpose |
|---|---|
| `alembic/` | Migration scripts and config |
| `alembic.ini` | Alembic config (DB URL injected at runtime from settings) |
| `api/index.py` | Vercel entrypoint — re-exports the FastAPI `app` |
| `vercel.json` | Vercel deployment routing config |
| `dev.db` | SQLite dev database (gitignored, created by migrations) |

## Database

### Dev: SQLite (default)

No setup needed. Running `alembic upgrade head` creates `dev.db`.

```bash
make migrate    # apply migrations
make reset-db   # delete dev.db and recreate from scratch
```

### Prod: PostgreSQL

Set `DATABASE_URL` and `DATABASE_URL_DIRECT` in `.env`. The app auto-rewrites `postgresql://` to `postgresql+asyncpg://` so you can paste standard Postgres connection strings directly.

### Dual URL Design

The app uses two database URLs because:
- **`DATABASE_URL`** → async driver (`asyncpg` / `aiosqlite`) for the running app
- **`DATABASE_URL_DIRECT`** → sync driver (`psycopg2` / `sqlite`) for Alembic, which runs migrations synchronously

### Connection Handling

- **NullPool** is used everywhere (both app and Alembic) — no persistent connection pool. This is intentional for Vercel's serverless deployment where connections can't be shared across invocations.
- For asyncpg, `database.py` strips unsupported query params (`sslmode`, `channel_binding`) and converts them into proper `ssl` connect args.
- Sessions use `expire_on_commit=False` so ORM objects remain usable after commit without triggering lazy-load errors in async context.

## Migrations (Alembic)

```bash
cd poly-myket-backend

# Apply all pending migrations
uv run alembic upgrade head

# Create a new auto-generated migration
uv run alembic revision --autogenerate -m "description of change"

# Check current revision
uv run alembic current

# Downgrade one step
uv run alembic downgrade -1
```

The `alembic.ini` file leaves `sqlalchemy.url` empty — it's injected at runtime from `settings.database_url_direct` in `alembic/env.py`.

### Migration History

| Revision | Description |
|---|---|
| `623ad60924ad` | Initial schema (users, groups, group_members, bets, wagers) |
| `13b5620ad870` | Add credit_adjustments table, add role to group_members |
| `ec8f67eaaeea` | Add clerk_id to users |
| `537477e90bfa` | Add resolved_at to bets, rename status values to success/fail |
| `1eb2e18b091f` | Add image_url to users |
| `369be0577cf6` | Add starting_credits to groups |

## Authentication

Auth is handled via [Clerk](https://clerk.com). There is no auth router — user registration is automatic.

### How it works

1. The frontend authenticates with Clerk and gets a JWT.
2. Every API request includes `Authorization: Bearer <jwt>`.
3. `app/dependencies.py` validates the JWT against Clerk's JWKS endpoint using `fastapi-clerk-auth`.
4. On first request, a `User` record is **auto-provisioned** from JWT claims (`sub`, `email`, `name`).
5. Subsequent requests update stale email/display_name if the JWT claims have changed.

All protected endpoints receive the current `User` ORM object via `Depends(get_current_user)`.

## Data Model

```
User
 ├── clerk_id (unique, from Clerk JWT)
 ├── email, display_name, image_url
 ├── group_memberships → [GroupMember]
 └── wagers → [Wager]

Group
 ├── name, invite_code (8-char random), starting_credits
 ├── members → [GroupMember]
 └── bets → [Bet]

GroupMember
 ├── group_id → Group, user_id → User
 ├── credit_balance (Numeric 10,2)
 ├── role (admin | member)
 └── credit_adjustments → [CreditAdjustment]

Bet
 ├── group_id → Group
 ├── created_by → User (creator), subject_id → User (who the bet is about)
 ├── description, deadline, proof_image_url
 ├── status (open | resolved_success | resolved_fail | cancelled)
 └── wagers → [Wager]

Wager
 ├── bet_id → Bet, user_id → User
 ├── amount (Numeric 10,2)
 └── side (yes | no)

CreditAdjustment
 ├── member_id → GroupMember, adjusted_by → User
 ├── amount (Numeric 10,2)
 └── reason (text)
```

All tables have UUID primary keys, `created_at`, and `updated_at` via shared mixins. Enums are stored as VARCHAR strings (`native_enum=False`) for SQLite/PostgreSQL compatibility.

## API Reference

All endpoints except `GET /` require a valid Clerk JWT in the `Authorization` header.

### Users

| Method | Path | Description |
|---|---|---|
| `GET` | `/users/me` | Current user |
| `GET` | `/users/me/profile` | Full profile with memberships and wager history |
| `PATCH` | `/users/me` | Update profile (image_url) |

### Groups

| Method | Path | Description |
|---|---|---|
| `POST` | `/groups` | Create group (caller becomes admin) |
| `POST` | `/groups/join` | Join group via invite code (idempotent) |
| `GET` | `/groups` | List my groups |
| `GET` | `/groups/{group_id}` | Group detail with members (must be member) |
| `POST` | `/groups/{group_id}/adjust-credits` | Adjust a member's credits (admin only) |
| `GET` | `/groups/{group_id}/credit-adjustments` | List credit adjustment history |
| `POST` | `/groups/{group_id}/promote` | Promote a member to admin (admin only) |

### Bets

| Method | Path | Description |
|---|---|---|
| `POST` | `/groups/{group_id}/bets` | Create a bet (subject must be a group member) |
| `GET` | `/groups/{group_id}/bets` | List all bets in group |
| `GET` | `/bets/{bet_id}` | Get single bet |
| `POST` | `/bets/{bet_id}/resolve` | Resolve bet as success/fail (creator or admin) |
| `POST` | `/bets/{bet_id}/cancel` | Cancel bet and refund all wagers (creator or admin) |

### Wagers

| Method | Path | Description |
|---|---|---|
| `POST` | `/bets/{bet_id}/wagers` | Place a wager (must have sufficient credits) |

## Business Logic

### Credit System

- Members receive `starting_credits` (configured per group) when joining.
- Placing a wager deducts the amount from the member's `credit_balance`.
- Admins can manually adjust credits via the adjust-credits endpoint.

### Bet Resolution & Payout

When a bet is resolved:

1. **Determine winning side**: `YES` if outcome is `success`, `NO` if `fail`.
2. **Calculate total pool**: sum of all wagers (both sides).
3. **Distribute to winners**: each winner receives a share of the total pool proportional to their wager amount relative to the total winning-side wagers.
4. **Edge case — no winners**: if nobody bet on the winning side, all wagers are refunded.
5. All arithmetic uses `Decimal(str(...))` to avoid floating-point drift on `Numeric(10,2)` columns.

### Bet Cancellation

When a bet is cancelled, all wagers are refunded — each wager amount is added back to the respective member's `credit_balance`.

### Who Can Resolve/Cancel

The **bet creator** or any **group admin** can resolve or cancel a bet.

## Deployment

The backend deploys to **Vercel** as a Python serverless function.

- `api/index.py` re-exports the FastAPI app for Vercel's Python runtime.
- `vercel.json` routes all requests to `api/index.py`.
- `NullPool` is used since serverless functions don't maintain persistent connections.

## Dependencies

| Package | Purpose |
|---|---|
| `fastapi[standard]` | Web framework (includes uvicorn, pydantic) |
| `sqlalchemy>=2.0` | Async ORM (2.0 mapped-column style) |
| `asyncpg` | Async PostgreSQL driver |
| `psycopg2-binary` | Sync PostgreSQL driver (Alembic) |
| `aiosqlite` | Async SQLite driver (dev) |
| `alembic` | Database migrations |
| `pydantic-settings` | Settings from env vars |
| `fastapi-clerk-auth` | Clerk JWT verification |
| `greenlet` | Required for SQLAlchemy async |

Python version: **3.12** (specified in `.python-version`)
