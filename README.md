# Poly-Myket

Social betting app where friends bet on each other's real-life commitments using credits.

---

## Quick Start

```bash
# Backend
cd poly-myket-backend && uv sync
cp .env.example .env  # then fill in values

# Frontend
cd poly-myket-frontend && bun install
cp .env.local.example .env.local  # then fill in values

# Run everything
make dev  # backend :6767 + frontend :6969
```

## Monorepo Structure

```
poly-myket/
├── poly-myket-backend/          # Python FastAPI API
│   ├── api/index.py             # Vercel serverless entry point
│   ├── app/
│   │   ├── main.py              # FastAPI app, CORS, router registration
│   │   ├── config.py            # Pydantic settings (loads .env)
│   │   ├── database.py          # SQLAlchemy async engine/session
│   │   ├── dependencies.py      # JWT auth dependency (Clerk JWKS)
│   │   ├── models/              # SQLAlchemy ORM models
│   │   ├── schemas/             # Pydantic request/response schemas
│   │   └── routers/             # Route handlers
│   ├── alembic/                 # Database migrations
│   ├── vercel.json              # Vercel deployment config
│   └── pyproject.toml           # Python dependencies (uv)
│
├── poly-myket-frontend/         # Next.js 16 TypeScript app
│   ├── src/
│   │   ├── app/                 # Next.js App Router pages
│   │   │   ├── (auth)/          # Public auth pages (sign-in, sign-up)
│   │   │   ├── (app)/           # Protected routes (groups, bets, profile)
│   │   │   └── invite/[code]/   # Public invite link handler
│   │   ├── components/          # UI components
│   │   ├── lib/                 # API client, types, utils
│   │   └── proxy.ts             # Clerk middleware (route protection)
│   ├── package.json             # Node dependencies (bun)
│   └── next.config.ts
│
├── Makefile                     # Dev commands
├── .github/workflows/           # CI/CD (migration runner)
└── CLAUDE.md                    # AI agent instructions
```

## Makefile Targets

| Target | Command | Description |
|--------|---------|-------------|
| `make backend` | `uvicorn app.main:app --reload --port 6767` | Backend dev server |
| `make frontend` | `npm run dev -- --port 6969` | Frontend dev server |
| `make dev` | Runs both concurrently | Full dev environment |
| `make migrate` | `alembic upgrade head` | Apply DB migrations |
| `make reset-db` | Deletes `dev.db` + migrate | Reset local database |
| `make lint-frontend` | `tsc --noEmit && eslint` | Typecheck + lint frontend |

---

## Infrastructure

### Database

| Environment | Engine | Config |
|-------------|--------|--------|
| **Dev** | SQLite (`dev.db`) | Zero config, default when no `DATABASE_URL` |
| **Prod** | PostgreSQL (Neon) | `DATABASE_URL` env var, uses asyncpg driver |

- `database.py` auto-converts `postgresql://` to `postgresql+asyncpg://`
- Strips `sslmode`/`channel_binding` params (asyncpg incompatible), converts to `ssl=True` connect_arg
- Uses `NullPool` (no connection pooling — suitable for serverless)
- Alembic migrations use `DATABASE_URL_DIRECT` (sync psycopg2 driver)

### Auth (Clerk)

```
User → Google OAuth → Clerk → JWT (RS256) → Frontend getToken() → Authorization: Bearer <jwt> → Backend JWKS verification
```

- **Frontend**: `@clerk/nextjs` — provides `useAuth()`, `useUser()`, `UserButton`, middleware
- **Backend**: `fastapi-clerk-auth` — `ClerkHTTPBearer` validates JWT via Clerk JWKS endpoint
- **User sync**: First API call auto-creates user in DB from JWT claims (`clerk_id`, `email`, `name`)
- **Token lifecycle**: Short-lived (~60s), Clerk auto-refreshes, no localStorage

### Deployment

- **Backend**: Vercel Python serverless (`api/index.py` entry point, all routes → single function)
- **Frontend**: Vercel (Next.js auto-detected)
- **CI/CD**: GitHub Actions runs `alembic upgrade head` on push to `main` when `alembic/**` changes

### Environment Variables

**Backend** (`.env`):
```
DATABASE_URL=postgresql+asyncpg://...          # Async DB connection
DATABASE_URL_DIRECT=postgresql+psycopg2://...  # Sync DB connection (migrations)
CLERK_JWKS_URL=https://....clerk.accounts.dev/.well-known/jwks.json
FRONTEND_URL=http://localhost:6969             # CORS origin
```

**Frontend** (`.env.local`):
```
NEXT_PUBLIC_API_URL=http://localhost:6767
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/groups
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/groups
```

---

## Data Model

```
┌──────────┐       ┌──────────────┐       ┌──────────┐
│  users   │──────<│ group_members │>──────│  groups   │
│          │       │              │       │          │
│ clerk_id │       │ credit_bal   │       │ name     │
│ email    │       │ role (enum)  │       │ invite_  │
│ display_ │       │              │       │   code   │
│   name   │       └──────┬───────┘       │ starting_│
│ image_url│              │               │   credits│
└────┬─────┘              │               └────┬─────┘
     │           ┌────────┴────────┐           │
     │           │credit_adjustments│           │
     │           │                 │           │
     │           │ amount          │           │
     │           │ reason          │           │
     │           │ adjusted_by(FK) │           │
     │           └─────────────────┘           │
     │                                         │
     │        ┌──────────┐                     │
     ├───────<│  wagers  │                     │
     │        │          │       ┌──────────┐  │
     │        │ amount   │>──────│   bets   │>─┘
     │        │ side     │       │          │
     │        │ (YES/NO) │       │ created_ │
     │        └──────────┘       │   by(FK) │
     │                           │ subject_ │
     └──────────────────────────<│   id(FK) │
                                 │ descript │
                                 │ deadline │
                                 │ status   │
                                 │ proof_   │
                                 │  image   │
                                 └──────────┘
```

### Key Fields

| Model | Notable Fields |
|-------|---------------|
| **User** | `clerk_id` (unique, indexed), `email` (unique), `image_url` |
| **Group** | `invite_code` (8-char random, unique), `starting_credits` (Numeric) |
| **GroupMember** | `credit_balance` (Numeric 10,2), `role` (ADMIN/MEMBER) |
| **Bet** | `status` (OPEN/RESOLVED_SUCCESS/RESOLVED_FAIL/CANCELLED), `deadline`, `proof_image_url` |
| **Wager** | `amount` (Numeric 10,2), `side` (YES/NO) |
| **CreditAdjustment** | `amount` (can be negative), `reason`, `adjusted_by` (admin FK) |

All models use UUID primary keys and `created_at`/`updated_at` timestamp mixins.

---

## API Routes

All endpoints except health check require `Authorization: Bearer <clerk_jwt>`.

### Health

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | No | Returns `{"status": "ok", "app": "poly-myket"}` |

### Users (`/users`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/users/me` | Yes | Current user profile |
| GET | `/users/me/profile` | Yes | Full profile: groups, memberships, wager history |
| PATCH | `/users/me` | Yes | Update user (currently: `image_url`) |

<details>
<summary>GET /users/me/profile — Response</summary>

```json
{
  "user": { "id": "uuid", "email": "...", "display_name": "...", "image_url": "...", "created_at": "..." },
  "memberships": [
    { "id": "uuid", "group_id": "uuid", "group_name": "...", "credit_balance": 100.0, "role": "admin" }
  ],
  "wagers": [
    {
      "id": "uuid", "bet_id": "uuid", "amount": 10.0, "side": "yes", "created_at": "...",
      "bet": { "id": "uuid", "group_id": "uuid", "group_name": "...", "description": "...", "status": "open", "resolved_at": null }
    }
  ]
}
```
</details>

### Groups (`/groups`)

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| POST | `/groups` | Yes | — | Create group (creator becomes ADMIN) |
| POST | `/groups/join` | Yes | — | Join group by invite code (idempotent) |
| GET | `/groups` | Yes | — | List user's groups |
| GET | `/groups/{group_id}` | Yes | Member | Group detail with members |
| POST | `/groups/{group_id}/adjust-credits` | Yes | Admin | Adjust member's credit balance |
| GET | `/groups/{group_id}/credit-adjustments` | Yes | Member | List credit adjustment history |
| POST | `/groups/{group_id}/promote` | Yes | Admin | Promote member to admin |

<details>
<summary>POST /groups — Request & Response</summary>

**Request:**
```json
{ "name": "string", "starting_credits": 100.0 }
```

**Response:**
```json
{ "id": "uuid", "name": "...", "invite_code": "Ab3xK9mQ", "starting_credits": 100.0, "created_at": "..." }
```
</details>

<details>
<summary>POST /groups/join — Request</summary>

```json
{ "invite_code": "Ab3xK9mQ" }
```
Returns the group. 404 if invalid code. 200 if already a member (idempotent).
New members receive `starting_credits` if set on the group.
</details>

<details>
<summary>GET /groups/{group_id} — Response</summary>

```json
{
  "id": "uuid", "name": "...", "invite_code": "...", "starting_credits": 100.0, "created_at": "...",
  "members": [
    {
      "id": "uuid", "group_id": "uuid", "user_id": "uuid",
      "credit_balance": 95.50, "role": "admin", "created_at": "...",
      "user": { "id": "uuid", "email": "...", "display_name": "...", "image_url": "..." }
    }
  ]
}
```
</details>

<details>
<summary>POST /groups/{group_id}/adjust-credits — Request</summary>

```json
{ "member_id": "uuid", "amount": -25.0, "reason": "Penalty for late resolution" }
```
Amount can be negative. Creates audit trail via `credit_adjustments` table. Requires admin role.
</details>

### Bets (`/groups/{group_id}/bets`, `/bets/{bet_id}`)

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| POST | `/groups/{group_id}/bets` | Yes | Member | Create bet in group |
| GET | `/groups/{group_id}/bets` | Yes | Member | List all bets in group |
| GET | `/bets/{bet_id}` | Yes | Member | Single bet with wagers |
| POST | `/bets/{bet_id}/resolve` | Yes | Creator/Admin | Resolve bet + settle wagers |
| POST | `/bets/{bet_id}/cancel` | Yes | Creator/Admin | Cancel bet + refund all wagers |

<details>
<summary>POST /groups/{group_id}/bets — Request</summary>

```json
{ "subject_id": "uuid", "description": "Joe will build his IKEA shelf by Friday", "deadline": "2026-03-07T18:00:00Z" }
```
Subject must be a group member. Deadline is optional.
</details>

<details>
<summary>POST /bets/{bet_id}/resolve — Request & Settlement Logic</summary>

**Request:**
```json
{ "outcome": "success", "proof_image_url": "https://..." }
```

**Settlement algorithm:**
1. `outcome: "success"` → winning side = YES; `outcome: "fail"` → winning side = NO
2. `total_pool` = sum of all wager amounts
3. If winners exist: each winner gets `(their_wager / total_winning_wagers) * total_pool`
4. If no winners: refund all wagers
5. Credits updated on `GroupMember.credit_balance`
</details>

<details>
<summary>POST /bets/{bet_id}/cancel</summary>

No request body. Refunds all wager amounts back to each wagerer's credit balance. Sets status to CANCELLED.
</details>

### Wagers (`/bets/{bet_id}/wagers`)

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| POST | `/bets/{bet_id}/wagers` | Yes | Member | Place wager on a bet |

<details>
<summary>POST /bets/{bet_id}/wagers — Request</summary>

```json
{ "amount": 10.0, "side": "yes" }
```

**Validations:** Bet must be OPEN, amount > 0, user must have sufficient `credit_balance`. Credits are deducted immediately on wager creation.
</details>

### Error Responses

All errors follow:
```json
{ "detail": "Error message string" }
```

| Code | Meaning |
|------|---------|
| 400 | Validation failure (bet not open, insufficient credits, invalid input) |
| 403 | Not a group member, not an admin, not bet creator |
| 404 | Resource not found (group, bet, member) |

---

## Frontend Routes

| Path | Auth | Page | Key API Calls |
|------|------|------|--------------|
| `/` | No | Landing page with CTA | — |
| `/sign-in` | No | Clerk sign-in | — |
| `/sign-up` | No | Clerk sign-up | — |
| `/invite/[code]` | No* | Auto-join group via link | `joinGroup()` |
| `/groups` | Yes | All groups + recent bets | `getGroups()`, `getBets()` per group |
| `/groups/new` | Yes | Create group form | `createGroup()` |
| `/groups/join` | Yes | Join by invite code | `joinGroup()` |
| `/groups/[id]` | Yes | Group detail (tabs: Bets, Members, Admin) | `getGroup()`, `getBets()` |
| `/groups/[id]/bets/new` | Yes | Create bet form | `getGroup()`, `getMe()`, `createBet()` |
| `/groups/[id]/bets/[id]` | Yes | Bet detail, wager form, resolve/cancel | `getBet()`, `placeWager()`, `resolveBet()`, `cancelBet()` |
| `/profile` | Yes | User stats, credit balances, wager history | `getMyProfile()` |

*`/invite/[code]` redirects unauthenticated users to sign-up, then back to the invite link.

### Frontend API Client (`src/lib/api.ts`)

```typescript
// Users
api.getMe()                                    → User
api.getMyProfile()                             → UserProfile
api.updateMe({ image_url })                    → User

// Groups
api.getGroups()                                → Group[]
api.createGroup({ name, starting_credits? })   → Group
api.joinGroup({ invite_code })                 → Group
api.getGroup(id)                               → GroupDetail

// Bets
api.getBets(groupId)                           → Bet[]
api.getBet(betId)                              → Bet
api.createBet(groupId, { subject_id, description, deadline? }) → Bet
api.resolveBet(betId, { outcome, proof_image_url? })           → Bet
api.cancelBet(betId)                           → Bet

// Wagers
api.placeWager(betId, { amount, side })        → Wager

// Admin
api.adjustCredits(groupId, { member_id, amount, reason? }) → CreditAdjustment
api.getCreditAdjustments(groupId)              → CreditAdjustment[]
api.promoteMember(groupId, { member_id })      → GroupMember
```

Auth token is injected automatically via `ApiProvider` which calls `setTokenGetter(() => getToken())` from Clerk's `useAuth()`.

---

## Key Business Logic

### Credit System
- Members start with `group.starting_credits` on join (if > 0)
- Placing a wager **immediately deducts** credits from balance
- Resolving distributes the **entire pool** proportionally to winners
- If no one bet the winning side, **all wagers are refunded**
- Cancelling a bet **refunds all wagers**
- Admins can manually adjust credits (positive or negative) with a reason

### Role-Based Access
- **Admin**: Resolve/cancel any bet, adjust credits, promote members. Auto-assigned to group creator.
- **Member**: Create bets, place wagers, view group data. Default role on join.

### Odds Calculation (Frontend)
```
yesProbability = yesAmount / totalVolume  (default 50% if no wagers)
noProbability  = noAmount / totalVolume
yesPrice = yesAmount / totalVolume
noPrice  = noAmount / totalVolume
```

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend | Next.js + TypeScript | 16.1.6 |
| UI | ShadCN/UI (New York) + Tailwind CSS 4 | — |
| Backend | FastAPI (async) | latest |
| ORM | SQLAlchemy 2.0+ | async |
| DB (dev) | SQLite | aiosqlite |
| DB (prod) | PostgreSQL (Neon) | asyncpg |
| Auth | Clerk | @clerk/nextjs 6.39 |
| Migrations | Alembic | — |
| Package Mgmt | uv (Python), bun (Node) | — |
| Deployment | Vercel (serverless) | — |
| CI/CD | GitHub Actions | — |
