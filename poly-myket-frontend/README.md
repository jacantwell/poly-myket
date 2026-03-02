# Poly-Myket Frontend

Next.js 16 + React 19 frontend for the Poly-Myket social betting app. Uses Clerk for authentication, ShadCN/UI for components, and Tailwind CSS 4 for styling.

## Quick Start

```bash
# From repo root (recommended)
make frontend          # dev server on port 6969

# Or directly
cd poly-myket-frontend
bun install            # bun preferred, npm works too
npm run dev            # dev server on port 3000
```

### Environment Variables

Copy `.env.local.example` to `.env.local` and fill in:

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Backend URL (defaults to `http://localhost:6767` in code) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key |
| `CLERK_SECRET_KEY` | Clerk secret key |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | Sign-in page path (`/sign-in`) |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | Sign-up page path (`/sign-up`) |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` | Redirect after sign-in (`/groups`) |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` | Redirect after sign-up (`/groups`) |

### Scripts

```bash
npm run dev        # dev server
npm run build      # production build
npm run start      # start production server
npm run lint       # ESLint
npm run typecheck  # TypeScript type checking
make lint-frontend # both typecheck + ESLint (from repo root)
```

> **Important**: Always use `make lint-frontend` from the repo root for linting. Do not use `npx tsc` directly — it breaks due to nvm shell interference.

## Architecture

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| React | React 19 (with `use()` hook for params) |
| Auth | Clerk (`@clerk/nextjs`) |
| UI Components | ShadCN/UI (new-york style) + Radix primitives |
| Styling | Tailwind CSS 4 (CSS-first config) |
| Icons | Lucide React |
| Toasts | Sonner |
| Forms | React Hook Form + Zod (installed, not yet used in pages) |
| Class Utils | `clsx` + `tailwind-merge` via `cn()` helper |

### Directory Structure

```
src/
├── proxy.ts                              # Clerk middleware (route protection)
├── app/
│   ├── layout.tsx                        # Root: ClerkProvider → ApiProvider → Toaster
│   ├── page.tsx                          # Landing (/ → /groups if signed in)
│   ├── globals.css                       # Tailwind v4 config + design tokens
│   ├── (auth)/                           # Unauthenticated routes
│   │   ├── sign-in/[[...sign-in]]/page.tsx
│   │   └── sign-up/[[...sign-up]]/page.tsx
│   ├── (app)/                            # Authenticated routes (with header)
│   │   ├── layout.tsx                    # Auth guard + AppHeader + skeleton
│   │   ├── profile/page.tsx
│   │   └── groups/
│   │       ├── page.tsx                  # Dashboard — all groups + bets
│   │       ├── new/page.tsx              # Create group form
│   │       ├── join/page.tsx             # Join via invite code
│   │       └── [groupId]/
│   │           ├── page.tsx              # Group detail (tabs: Bets, Members, Admin)
│   │           └── bets/
│   │               ├── new/page.tsx      # Create bet form
│   │               └── [betId]/page.tsx  # Bet detail + wager form
│   └── invite/
│       └── [code]/page.tsx              # Auto-join flow (outside (app) group)
├── components/
│   ├── ui/                              # ShadCN components (don't edit directly)
│   ├── layout/
│   │   └── app-header.tsx               # Sticky header with nav + user menu
│   ├── bet-card.tsx                     # Bet card + skeleton
│   ├── group-bets-section.tsx           # Group section with bet grid
│   ├── member-select.tsx                # Radix dropdown for member selection
│   ├── user-avatar.tsx                  # Avatar with deterministic color fallback
│   └── wager-form.tsx                   # Yes/No toggle + amount input
└── lib/
    ├── api.ts                           # Fetch-based API client
    ├── api-provider.tsx                 # Bridges Clerk auth → API client
    ├── types.ts                         # TypeScript interfaces (mirrors backend models)
    ├── constants.ts                     # Routes, status labels, badge variants
    ├── bet-utils.ts                     # Odds calculation + credit formatting
    └── utils.ts                         # cn() class composition helper
```

## Key Concepts

### Authentication Flow

Two-layer auth protection:

1. **Middleware** (`src/proxy.ts`) — Clerk server-side. Protects `/groups/**` and `/bets/**` routes. Unauthenticated users get redirected to Clerk's sign-in page.
2. **App layout** (`(app)/layout.tsx`) — Client-side guard via `useUser()`. Shows a loading skeleton during Clerk init, renders nothing if not signed in (belt-and-suspenders with middleware).

The **token bridge** works via `ApiProvider` (mounted in root layout inside `<ClerkProvider>`):
- On mount, it calls `setTokenGetter(() => getToken())` to wire Clerk's JWT token into the stateless `api` module
- Every `api` call automatically attaches `Authorization: Bearer <token>` headers
- Also syncs the Clerk avatar URL to the backend on mount

### Invite Flow

The invite link (`/invite/:code`) lives outside the `(app)` route group intentionally:
1. Unauthenticated user → redirected to `/sign-up?redirect_url=/invite/:code`
2. After sign-up, Clerk redirects back to `/invite/:code`
3. Page auto-calls `api.joinGroup()` and redirects to the group on success

### API Client (`src/lib/api.ts`)

A plain fetch wrapper with no caching or retry logic:

```typescript
// All methods return typed responses
const group = await api.getGroup(groupId);      // → GroupDetailResponse
const bets = await api.getBets(groupId);         // → Bet[]
await api.placeWager(betId, { side: "yes", amount: 10 });
```

Errors throw `ApiClientError` with `status` (HTTP code) and `message` (response body text). Pages catch these for status-specific error handling (e.g., 404 → "not found" toast).

### State Management

No global state library. Each page manages its own data using a discriminated union pattern:

```typescript
type PageState =
  | { status: "loading" }
  | { status: "loaded"; groups: Group[]; bets: Map<string, Bet[]> }
  | { status: "error"; message: string };

const [state, setState] = useState<PageState>({ status: "loading" });
```

Data fetching uses `useCallback` + `useEffect`:
- `Promise.all()` on detail pages (all data required)
- `Promise.allSettled()` on the dashboard (partial failures don't break the page)
- Mutations trigger parent `fetchData()` passed as callback props to re-fetch

### Route Params (React 19)

Dynamic route params are typed as `Promise` and unwrapped with the `use()` hook:

```typescript
export default function Page({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = use(params);
  // ...
}
```

## Styling

### Tailwind CSS 4 (CSS-First Config)

No `tailwind.config.ts`. All configuration lives in `src/app/globals.css`:

```css
@import "tailwindcss";
@import "tw-animate-css";
@import "shadcn/tailwind.css";

@custom-variant dark (&:is(.dark *));
```

### Custom Design Tokens

Betting-specific colors are defined as CSS custom properties and bridged into Tailwind utilities:

| Token | Usage | Tailwind Class |
|-------|-------|---------------|
| `--yes` | Yes wager / positive outcome (green) | `bg-yes`, `text-yes` |
| `--yes-light` | Yes button background (unselected) | `bg-yes-light` |
| `--no` | No wager / negative outcome (red) | `bg-no`, `text-no` |
| `--no-light` | No button background (unselected) | `bg-no-light` |

All colors use `oklch()` with light/dark mode variants. Dark mode is toggled via `.dark` class on an ancestor element.

### ShadCN/UI

Components live in `src/components/ui/` — **do not edit directly**. To add new ones:

```bash
bunx shadcn add <component-name>
# or
npx shadcn add <component-name>
```

Config is in `components.json` (new-york style, neutral base color, lucide icons).

## Components Reference

### Custom Components

| Component | File | Purpose |
|-----------|------|---------|
| `AppHeader` | `components/layout/app-header.tsx` | Sticky blurred header with nav links, profile icon, and Clerk UserButton |
| `BetCard` / `BetCardSkeleton` | `components/bet-card.tsx` | Clickable card showing bet subject, description, probability bar, volume, and prices |
| `GroupBetsSection` | `components/group-bets-section.tsx` | Group name + responsive grid of BetCards + "New bet" add card |
| `UserAvatar` | `components/user-avatar.tsx` | Avatar with image or deterministic-color initials fallback. Sizes: `sm`, `default`, `lg` |
| `MemberSelect` | `components/member-select.tsx` | Radix dropdown for picking a group member (used in bet creation) |
| `WagerForm` | `components/wager-form.tsx` | Two-step Yes/No toggle + amount input for placing wagers |

### Routing Constants

All routes are centralized in `src/lib/constants.ts`:

```typescript
import { ROUTES } from "@/lib/constants";

ROUTES.groups              // "/groups"
ROUTES.group(id)           // "/groups/:id"
ROUTES.bet(groupId, betId) // "/groups/:groupId/bets/:betId"
ROUTES.invite(code)        // "/invite/:code"
ROUTES.newBet(groupId)     // "/groups/:groupId/bets/new"
ROUTES.profile             // "/profile"
```

## Pages Overview

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | `app/page.tsx` | Landing page (server component, redirects to `/groups` if signed in) |
| `/sign-in` | `(auth)/sign-in` | Clerk hosted sign-in |
| `/sign-up` | `(auth)/sign-up` | Clerk hosted sign-up |
| `/groups` | `(app)/groups/page.tsx` | Dashboard — all groups with their bets in grids |
| `/groups/new` | `(app)/groups/new/page.tsx` | Create group form, shows invite code/link after creation |
| `/groups/join` | `(app)/groups/join/page.tsx` | Join group via invite code input |
| `/groups/:id` | `(app)/groups/[groupId]/page.tsx` | Group detail with tabs: Bets, Members, Admin (admin-only) |
| `/groups/:id/bets/new` | `bets/new/page.tsx` | Create bet form with member select and deadline |
| `/groups/:id/bets/:id` | `bets/[betId]/page.tsx` | Bet detail — probability display, wager form, history, management |
| `/invite/:code` | `invite/[code]/page.tsx` | Auto-join flow (handles auth redirect + join) |
| `/profile` | `(app)/profile/page.tsx` | User stats, credit balances, wager history |

## Patterns and Conventions

- **`"use client"`** on all interactive pages — data fetching happens client-side via the `api` module
- **Error handling**: `ApiClientError` caught in try/catch, shown via `toast.error()`. Status-specific messages for 404s
- **Loading states**: Every page has a matching skeleton component using ShadCN's `<Skeleton>`
- **Forms**: Currently use plain `useState` per field. React Hook Form + Zod are installed for future use
- **Icons**: Lucide with explicit sizing (`className="h-4 w-4"`)
- **Numbers**: `tabular-nums` utility on all credit/amount displays for consistent digit alignment
- **Admin UI**: Conditionally rendered based on `currentMember.role === "admin"` from fetched data
- **Path alias**: `@/*` maps to `src/*`

## Odds Calculation (`src/lib/bet-utils.ts`)

```typescript
import { calculateOdds, formatCredits } from "@/lib/bet-utils";

const odds = calculateOdds(bet.wagers);
// → { yesProbability, noProbability, yesPrice, noPrice, totalVolume, yesAmount, noAmount }
// Returns 50/50 when there are no wagers

formatCredits(1200)  // → "1.2k"
formatCredits(50.5)  // → "50.5"
formatCredits(50)    // → "50"
```

## Domain Types (`src/lib/types.ts`)

All types mirror the backend models:

- `User`, `Group`, `GroupMember`, `Bet`, `Wager`, `CreditAdjustment`
- Status enums: `BetStatus` (`"open" | "resolved_success" | "resolved_fail" | "cancelled"`), `WagerSide` (`"yes" | "no"`), `GroupRole` (`"admin" | "member"`)
- Request types: `CreateGroupRequest`, `JoinGroupRequest`, `CreateBetRequest`, `ResolveBetRequest`, `PlaceWagerRequest`, `AdjustCreditsRequest`, `PromoteMemberRequest`
- Response types: `GroupDetailResponse`, `UserProfile`, `ProfileMembership`, `ProfileWager`
