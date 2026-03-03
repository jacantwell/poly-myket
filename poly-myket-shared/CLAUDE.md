# Shared Package — poly-myket-shared

Framework-agnostic TypeScript package published to npm and consumed by both the web frontend and the mobile app. Compiled to JS + declarations before publishing.

## Quick Start

```bash
cd poly-myket-shared && npm install
make build-shared   # compile to dist/ (from repo root)
make lint-shared    # typecheck (from repo root)
npm publish         # publish to npm (from this directory)
```

## Package Layout

```
src/
├── index.ts          # Barrel re-export of all modules
├── types.ts          # 14 interfaces + type aliases (mirrors backend models)
├── api.ts            # Fetch-based API client with injectable URL + token
├── bet-utils.ts      # calculateOdds(), formatCredits(), Odds type
├── constants.ts      # BET_STATUS_LABELS, GROUP_ROLE_LABELS, BET_STATUS_COLOR
└── globals.d.ts      # Minimal fetch type declarations (DOM-free)
```

## Conventions

- **No DOM lib** — code must stay DOM-free and work in Node, browsers, and React Native
- **Built + published to npm** — `npm run build` compiles to `dist/`. Consumers import the compiled JS + type declarations
- **No framework imports** — no React, no Next.js, no Expo. Pure TypeScript only
- **Injectable config** — `setApiUrl()` and `setTokenGetter()` let each consumer provide its own environment values

## API Client Architecture

The `api.ts` module uses a module-scoped configuration pattern:

```typescript
// Consumer (web frontend) sets the URL once at startup:
setApiUrl(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:6767");

// Consumer (mobile app) sets it differently:
setApiUrl(process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:6767");

// Both set the token getter from their respective Clerk SDK:
setTokenGetter(() => getToken());
```

All `api.*` methods auto-attach `Authorization: Bearer <token>` headers. Errors throw `ApiClientError` with `status` and `message`.

## Consumer Setup

### Web Frontend (`poly-myket-frontend`)
- `package.json`: `"poly-myket-shared": "0.1.0"`
- `src/lib/api.ts`: thin wrapper that calls `setApiUrl()` and re-exports

### Mobile App (`poly-myket-app`)
- `package.json`: `"poly-myket-shared": "0.1.0"`
- `hooks/useApiSetup.tsx`: calls `setApiUrl()` and `setTokenGetter()` on mount

## Adding New Exports

1. Add to the appropriate source file or create a new `src/<module>.ts`
2. Re-export from `src/index.ts`
3. Run `make build-shared` to compile
4. Bump version in `package.json` and `npm publish`
5. Run `npm install poly-myket-shared@<new-version>` in both consumers

## Rules

- Never import from `react`, `react-native`, `next`, `expo`, or any UI framework
- Never reference `process.env` — configuration is injected by consumers
- Never add `"dom"` to `tsconfig.json` `lib` — use `globals.d.ts` for web API types
- Keep `globals.d.ts` minimal — only declare types actually used in this package
