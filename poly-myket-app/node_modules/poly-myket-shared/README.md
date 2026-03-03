# @poly-myket/shared

Shared TypeScript package for the Poly-Myket monorepo. Contains framework-agnostic types, API client, and utilities used by both the web frontend and mobile app.

## What's Inside

| Module | Exports | Description |
|--------|---------|-------------|
| `types.ts` | 14 interfaces + type aliases | Domain types matching backend models (User, Group, Bet, Wager, etc.) |
| `api.ts` | `api`, `setApiUrl`, `setTokenGetter`, `ApiClientError` | Typed fetch-based API client with injectable config |
| `bet-utils.ts` | `calculateOdds`, `formatCredits`, `Odds` | Odds calculation from wagers array + credit number formatting |
| `constants.ts` | `BET_STATUS_LABELS`, `GROUP_ROLE_LABELS`, `BET_STATUS_COLOR` | UI label and color mappings for bet statuses and roles |

## Usage

This is a local package — not published to npm. Consumers reference it via `file:` dependency:

```json
{
  "dependencies": {
    "@poly-myket/shared": "file:../poly-myket-shared"
  }
}
```

```typescript
import { api, setApiUrl, setTokenGetter } from "@poly-myket/shared";
import type { Bet, Group, User } from "@poly-myket/shared";

// Configure once at app startup
setApiUrl("http://localhost:6767");
setTokenGetter(() => getClerkToken());

// Use typed API methods
const groups = await api.getGroups();
const bet = await api.getBet(betId);
```

## Design Decisions

- **No build step** — consumers compile the raw TypeScript source via their own bundlers
- **No DOM dependency** — works in Node, browsers, and React Native
- **Injectable configuration** — no hardcoded env vars; each consumer provides its own URL and auth token
- **No framework imports** — pure TypeScript, zero React/Next.js/Expo dependencies

## Development

```bash
# Typecheck
make lint-shared

# Changes are picked up automatically by consumers — no version bump needed
```
