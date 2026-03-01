# Poly-Myket

Social betting app where friends bet on each other's real-life commitments using credits.

## Project Structure

Monorepo with two independent apps:

- `poly-myket-backend/` — Python FastAPI API
- `poly-myket-frontend/` — Next.js 16 TypeScript frontend

## Backend (FastAPI + SQLAlchemy)

### Run

```bash
make backend   # uvicorn on port 6767 with hot reload
make frontend  # next.js on port 6969 with hot reload
make dev       # runs both concurrently
```

### Dependencies

```bash
cd poly-myket-backend && uv sync
```

### Database

- **Dev**: SQLite (`./dev.db`) — zero config, default when no `DATABASE_URL` set
- **Prod**: PostgreSQL via `DATABASE_URL` env var (asyncpg)

### Migrations (Alembic)

```bash
cd poly-myket-backend
uv run alembic upgrade head              # apply migrations
uv run alembic revision --autogenerate -m "description"  # create migration
```

### Backend Layout

- `app/main.py` — FastAPI app, CORS, router registration
- `app/config.py` — Pydantic settings (loads `.env`)
- `app/database.py` — SQLAlchemy async engine/session
- `app/dependencies.py` — JWT auth dependency (`get_current_user`)
- `app/models/` — SQLAlchemy ORM models (User, Group, GroupMember, Bet, Wager, CreditAdjustment)
- `app/schemas/` — Pydantic request/response schemas
- `app/routers/` — Route handlers (auth, users, groups, bets, wagers)

### Backend Conventions

- Async everywhere — all DB operations use `AsyncSession`
- UUID primary keys and timestamp mixins on all models (`models/base.py`)
- Credit amounts use `Numeric(10, 2)`
- Auth: JWT with HS256 via `python-jose`, Clerk JWKS for verification
- Dependency injection via FastAPI `Depends` for DB sessions and auth
- Enums for status fields: `BetStatus`, `WagerSide`, `GroupRole`

### Backend Env Vars (`.env`)

See `.env.example`. Key vars: `DATABASE_URL`, `DATABASE_URL_DIRECT`, `CLERK_JWKS_URL`, `FRONTEND_URL`

## Frontend (Next.js + TypeScript)

### Run

```bash
cd poly-myket-frontend
bun install   # install deps (bun preferred, npm works too)
make frontend # dev server on port 6969 (from repo root)
npm run dev   # dev server on port 3000 (default)
npm run build # production build
npm run lint  # ESLint
```

### Frontend Layout

- `src/app/` — Next.js App Router pages
  - `(auth)/` — Login/verify pages (unauthenticated layout)
  - `(app)/` — Protected routes (authenticated layout with header)
- `src/components/ui/` — ShadCN components (do not edit directly; use `npx shadcn add`)
- `src/components/layout/` — App layout components
- `src/lib/api.ts` — Centralized API client with typed methods
- `src/lib/auth.tsx` — Auth context provider
- `src/lib/types.ts` — Shared TypeScript interfaces
- `src/lib/constants.ts` — Route paths, status/role labels

### Frontend Conventions

- ShadCN/UI with Radix primitives for all UI components (`components.json`: new-york style, lucide icons)
- Tailwind CSS 4 for styling; `clsx` + `tailwind-merge` for conditional classes
- Zod for runtime form validation, React Hook Form for form state
- `"use client"` directive on interactive components
- Path alias: `@/*` maps to `src/*`
- Sonner for toast notifications

### Frontend Env Vars (`.env.local`)

See `.env.local.example`. Key var: `NEXT_PUBLIC_API_URL`

## Testing

No tests exist yet. When adding:
- Backend: use `pytest` with `pytest-asyncio` for async tests
- Frontend: use the testing setup that ships with Next.js
