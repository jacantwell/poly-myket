# Mobile App — Expo + React Native

## Quick Start

```bash
cd poly-myket-app && npm install
make app         # from repo root, Expo dev server
make app-ios     # run on iOS Simulator
make app-android # run on Android Emulator
```

## Linting

```bash
make lint-app    # typecheck (from repo root)
```

## Project Layout

```
app/
├── _layout.tsx                          # Root: Clerk + Paper + API + Toast
├── (auth)/
│   ├── _layout.tsx
│   └── sign-in.tsx                      # Google OAuth via expo-web-browser
├── (tabs)/
│   ├── _layout.tsx                      # Bottom tabs + auth guard
│   ├── index.tsx                        # Groups list (Markets tab)
│   └── profile.tsx                      # Profile (Profile tab)
├── groups/
│   ├── _layout.tsx
│   ├── new.tsx                          # Create group
│   ├── join.tsx                         # Join group
│   └── [groupId]/
│       ├── _layout.tsx
│       ├── index.tsx                    # Group detail (Bets/Members/Admin tabs)
│       └── bets/
│           ├── _layout.tsx
│           ├── new.tsx                  # Create bet
│           └── [betId].tsx              # Bet detail + wager form
└── invite/
    └── [code]/
        ├── _layout.tsx
        └── index.tsx                    # Deep link invite handler
components/
├── ApiSetup.tsx          # Wires Clerk auth → API client
├── BetCard.tsx           # Bet card with probability, volume, prices
├── EmptyState.tsx        # Icon + title + description + CTA
├── ProbabilityBar.tsx    # Green fill bar
├── UserAvatar.tsx        # Avatar.Image / Avatar.Text with color hash
└── WagerForm.tsx         # Side selector + amount input + submit
hooks/
└── useApiSetup.tsx       # setApiUrl + setTokenGetter + image sync
lib/
├── clerk-token-cache.ts  # expo-secure-store TokenCache
├── routes.ts             # Typed route constants
└── theme.ts              # React Native Paper MD3 theme + bet colors
```

## Conventions

- **Expo Router** file-based routing (v6)
- **React Native Paper** v5 (Material Design 3) for all UI primitives
- **poly-myket-shared** (npm) for types, API client, utilities (no duplication)
- **State**: Discriminated union pattern per screen (loading/loaded/error)
- **Data fetching**: `useCallback` + `useEffect`, same as web frontend
- **Toast**: `react-native-toast-message` (replaces web's Sonner)
- **Clipboard**: `expo-clipboard` for invite code/link copying
- **Auth**: Clerk for Expo with Google OAuth + expo-secure-store token cache
- **No global state library** — each screen fetches its own data

## Authentication Flow

1. `(tabs)/_layout.tsx` checks `useAuth().isSignedIn` — redirects to sign-in if not
2. `(auth)/sign-in.tsx` uses `useOAuth({ strategy: "oauth_google" })` + `expo-web-browser`
3. `ApiSetup` component wires `setTokenGetter(() => getToken())` from Clerk
4. All `api.*` calls auto-attach `Authorization: Bearer <token>`

## Deep Linking

- Custom scheme: `polymyket://invite/CODE`
- Universal links: `https://polymyket.vercel.app/invite/CODE`
- Configured in `app.json` (scheme, associatedDomains, intentFilters)

## Environment Variables

`.env`: `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`
