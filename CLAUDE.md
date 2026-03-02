# Poly-Myket

Social betting app where friends bet on each other's real-life commitments using credits.

## Project Structure

Monorepo with two independent apps — each has its own `CLAUDE.md` with app-specific conventions:

- `poly-myket-backend/` — Python FastAPI API (see `poly-myket-backend/CLAUDE.md`)
- `poly-myket-frontend/` — Next.js 16 TypeScript frontend (see `poly-myket-frontend/CLAUDE.md`)

## Dev Commands (Makefile)

```bash
make backend        # uvicorn on port 6767 with hot reload
make frontend       # next.js on port 6969 with hot reload
make dev            # runs both concurrently
make migrate        # alembic upgrade head
make reset-db       # delete dev.db + recreate from migrations
make lint-frontend  # typecheck + ESLint (always use this, not npx tsc)
```

## Infrastructure

### Database

- **Dev**: SQLite (`dev.db`) — zero config, default when no `DATABASE_URL` set
- **Prod**: PostgreSQL (Neon) via `DATABASE_URL` env var (asyncpg)
- Dual URL design: `DATABASE_URL` (async driver for app) + `DATABASE_URL_DIRECT` (sync driver for Alembic)

### Auth (Clerk)

```
User → Google OAuth → Clerk → JWT (RS256) → Frontend getToken() → Authorization: Bearer <jwt> → Backend JWKS verification
```

- **Frontend**: `@clerk/nextjs` — `useAuth()`, `useUser()`, `UserButton`, middleware
- **Backend**: `fastapi-clerk-auth` — validates JWT via Clerk JWKS endpoint
- **User sync**: First API call auto-creates user in DB from JWT claims (`clerk_id`, `email`, `name`)
- **Token lifecycle**: Short-lived (~60s), Clerk auto-refreshes, no localStorage

### Deployment

- **Backend**: Vercel Python serverless (`api/index.py` entry point)
- **Frontend**: Vercel (Next.js auto-detected)
- **CI/CD**: GitHub Actions runs `alembic upgrade head` on push to `main` when `alembic/**` changes

## Data Model

```
User (clerk_id, email, display_name, image_url, email_bet_created, email_wager_placed, email_bet_resolved)
  ├── GroupMember (credit_balance, role: admin|member)
  │     └── CreditAdjustment (amount, reason, adjusted_by)
  ├── Bet (description, deadline, status, proof_image_url, created_by, subject_id)
  │     └── Wager (amount, side: yes|no, user_id)
  └── Group (name, invite_code, starting_credits)
```

All tables: UUID primary keys, `created_at`/`updated_at` timestamp mixins. Enums stored as VARCHAR strings for SQLite/PostgreSQL compatibility.

## Key Business Logic

### Credit System
- Members start with `group.starting_credits` on join
- Placing a wager **immediately deducts** credits
- Resolving distributes the **entire pool** proportionally to winners
- No winners on the winning side → **all wagers refunded**
- Cancelling a bet → **refunds all wagers**
- Admins can manually adjust credits (positive or negative) with a reason

### Bet Resolution
1. `outcome: "success"` → winning side = YES; `"fail"` → winning side = NO
2. Total pool = sum of all wager amounts
3. Each winner gets `(their_wager / total_winning_wagers) * total_pool`
4. All arithmetic uses `Decimal(str(...))` to avoid floating-point drift

### Email Notifications (Resend)
- Sent from the backend after key events; silently skipped when `RESEND_API_KEY` is not set (safe for local dev)
- **Bet created** → all group members except the creator (`email_bet_created` pref)
- **Wager placed** → the bet creator, unless wagerer = creator (`email_wager_placed` pref)
- **Bet resolved** → all users who wagered, deduplicated, with win/loss/refund messaging (`email_bet_resolved` pref)
- All preferences default to `True` (opt-in by default); toggled via `PATCH /users/me` and the profile page
- Email failures are caught and logged — they never break the main operation

### Role-Based Access
- **Admin**: Resolve/cancel any bet, adjust credits, promote members. Auto-assigned to group creator.
- **Member**: Create bets, place wagers, view group data. Default role on join.

## Environment Variables

**Backend** (`.env`): `DATABASE_URL`, `DATABASE_URL_DIRECT`, `CLERK_JWKS_URL`, `FRONTEND_URL`, `RESEND_API_KEY`, `EMAIL_FROM`

**Frontend** (`.env.local`): `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, Clerk route URLs

## Testing

No tests exist yet. When adding:
- Backend: use `pytest` with `pytest-asyncio` for async tests
- Frontend: use the testing setup that ships with Next.js
