# Frontend — Next.js 16 + React 19

## Quick Start

```bash
cd poly-myket-frontend && bun install
make frontend    # from repo root, port 6969
```

## Linting

**Always use `make lint-frontend` from the repo root.** Do not use `npx tsc` directly — it breaks due to nvm shell interference.

```bash
make lint-frontend  # typecheck + ESLint (from repo root)
```

## Project Layout

```
src/
├── proxy.ts                    # Clerk middleware (route protection)
├── app/
│   ├── layout.tsx              # Root: ClerkProvider → ApiProvider → Toaster
│   ├── page.tsx                # Landing (/ → /groups if signed in)
│   ├── globals.css             # Tailwind v4 config + design tokens
│   ├── (auth)/                 # Unauthenticated routes (sign-in, sign-up)
│   ├── (app)/                  # Authenticated routes (with header)
│   │   ├── layout.tsx          # Auth guard + AppHeader + skeleton
│   │   ├── profile/page.tsx
│   │   └── groups/             # Dashboard, group detail, bets
│   └── invite/[code]/page.tsx  # Auto-join flow (outside (app) group)
├── components/
│   ├── ui/                     # ShadCN components (DON'T EDIT DIRECTLY)
│   ├── layout/app-header.tsx
│   ├── bet-card.tsx, group-bets-section.tsx, member-select.tsx,
│   │   user-avatar.tsx, wager-form.tsx
└── lib/
    ├── api.ts                  # Fetch-based API client (typed methods)
    ├── api-provider.tsx        # Bridges Clerk auth → API client
    ├── types.ts                # TypeScript interfaces (mirrors backend models)
    ├── constants.ts            # Routes, status labels, badge variants
    ├── bet-utils.ts            # Odds calculation + credit formatting
    └── utils.ts                # cn() class composition helper
```

## Conventions

- **`"use client"`** on all interactive pages — data fetching is client-side via the `api` module
- **Path alias**: `@/*` maps to `src/*`
- **ShadCN/UI**: Don't edit `components/ui/` directly. Add components with `bunx shadcn add <name>` (new-york style, lucide icons)
- **Icons**: Lucide with explicit sizing (`className="h-4 w-4"`)
- **Toasts**: Sonner (`toast.error()`, `toast.success()`)
- **Numbers**: `tabular-nums` utility on all credit/amount displays
- **Forms**: Currently plain `useState` per field. React Hook Form + Zod installed for future use
- **Admin UI**: Conditionally rendered based on `currentMember.role === "admin"` from fetched data

## Styling

### Tailwind CSS 4 (CSS-First Config)

No `tailwind.config.ts`. All configuration in `src/app/globals.css`:

```css
@import "tailwindcss";
@import "tw-animate-css";
@import "shadcn/tailwind.css";
```

### Custom Design Tokens

Betting-specific colors defined as CSS custom properties in `globals.css`:

| Token | Tailwind Class | Usage |
|-------|---------------|-------|
| `--yes` / `--yes-light` | `bg-yes`, `text-yes`, `bg-yes-light` | Yes wager / positive (green) |
| `--no` / `--no-light` | `bg-no`, `text-no`, `bg-no-light` | No wager / negative (red) |

All colors use `oklch()` with light/dark mode variants.

## State Management

No global state library. Each page uses a discriminated union pattern:

```typescript
type PageState =
  | { status: "loading" }
  | { status: "loaded"; data: T }
  | { status: "error"; message: string };
```

Data fetching: `useCallback` + `useEffect`. `Promise.all()` on detail pages, `Promise.allSettled()` on dashboard.

## Route Params (React 19)

Dynamic route params are `Promise` — unwrap with `use()`:

```typescript
export default function Page({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = use(params);
}
```

## Authentication Flow

Two-layer protection:
1. **Middleware** (`proxy.ts`) — Clerk server-side, protects `/groups/**` and `/bets/**`
2. **App layout** (`(app)/layout.tsx`) — Client-side guard via `useUser()`

Token bridge: `ApiProvider` calls `setTokenGetter(() => getToken())` to wire Clerk JWT into the `api` module. Every `api` call auto-attaches `Authorization: Bearer <token>`.

## Invite Flow

`/invite/:code` lives outside `(app)` route group:
1. Unauthenticated → redirect to `/sign-up?redirect_url=/invite/:code`
2. After sign-up → Clerk redirects back
3. Page auto-calls `api.joinGroup()` and redirects to group

## API Client (`src/lib/api.ts`)

Plain fetch wrapper, no caching/retry. Errors throw `ApiClientError` with `status` and `message`. Routes centralized in `src/lib/constants.ts` (`ROUTES.groups`, `ROUTES.group(id)`, etc.). Includes `updateEmailPreferences()` for toggling notification settings via `PATCH /users/me`.

## Email Preferences UI

Profile page (`profile/page.tsx`) includes an `EmailPreferencesCard` with Switch toggles for:
- **New bets** (`email_bet_created`) — when someone creates a bet in your group
- **Wagers on your bets** (`email_wager_placed`) — when someone wagers on your bet
- **Bet results** (`email_bet_resolved`) — when a bet you wagered on is resolved

Uses optimistic toggling: updates state immediately, reverts on API error. Placed between "Credit Balances" and "Wager History" cards.

## Testing

No tests yet. When adding: use the testing setup that ships with Next.js.
