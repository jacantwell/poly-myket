# Poly-Myket Mobile App

Expo + React Native mobile app for Poly-Myket. Full feature parity with the web frontend — same API, same Clerk auth, same business logic.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Expo SDK 54 + Expo Router v6 |
| UI | React Native Paper v5 (Material Design 3) |
| Auth | Clerk for Expo + expo-secure-store |
| Shared Code | `@poly-myket/shared` (types, API client, utilities) |
| Navigation | File-based routing (Expo Router) |

## Quick Start

```bash
# Install dependencies
cd poly-myket-app && npm install

# Start Expo dev server (backend must be running)
make app          # from repo root

# Or run on specific platform
make app-ios      # iOS Simulator
make app-android  # Android Emulator

# Run backend + mobile concurrently
make dev-mobile
```

## Environment Variables

Create `.env` in this directory:

```
EXPO_PUBLIC_API_URL=http://localhost:6767
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
```

For the Clerk publishable key, use the same Clerk project as the web frontend. You'll also need to enable the mobile platform in the Clerk dashboard and configure Google OAuth client IDs for iOS/Android.

## Screens

| Screen | Route | Description |
|--------|-------|-------------|
| Sign In | `/(auth)/sign-in` | Google OAuth via expo-web-browser |
| Markets | `/(tabs)/` | Groups list with bet cards, pull-to-refresh |
| Profile | `/(tabs)/profile` | Stats, credit balances, email prefs, wager history, sign out |
| Group Detail | `/groups/[groupId]` | Bets/Members/Admin tabs with segmented buttons |
| Bet Detail | `/groups/[groupId]/bets/[betId]` | Probability, wager form, wager list, resolve/cancel |
| Create Group | `/groups/new` | Name + starting credits form |
| Join Group | `/groups/join` | Invite code input |
| Create Bet | `/groups/[groupId]/bets/new` | Description, stake, deadline form |
| Invite | `/invite/[code]` | Deep link handler — auto-joins group |

## Deep Linking

- **Custom scheme**: `polymyket://invite/CODE`
- **Universal links**: `https://polymyket.vercel.app/invite/CODE`

Configured in `app.json` via `scheme`, `associatedDomains` (iOS), and `intentFilters` (Android).

## Project Structure

```
poly-myket-app/
├── app/                    # Expo Router file-based routes
│   ├── _layout.tsx         # Root: ClerkProvider + PaperProvider + ApiSetup + Toast
│   ├── (auth)/             # Unauthenticated routes
│   ├── (tabs)/             # Bottom tab navigation (Markets + Profile)
│   ├── groups/             # Group and bet screens (stack navigation)
│   └── invite/[code]/      # Deep link invite handler
├── components/             # Reusable UI components
├── hooks/                  # Custom hooks (API setup)
├── lib/                    # Theme, routes, Clerk token cache
├── app.json                # Expo config (scheme, bundle IDs, deep links)
├── metro.config.js         # Monorepo config (watchFolders for shared package)
└── package.json
```

## Development Notes

- The app uses `@poly-myket/shared` for all types, API methods, and utilities — no duplication with the web frontend
- Metro is configured to watch `../poly-myket-shared` for hot reloading during development
- State management follows the same discriminated union pattern as the web frontend
- No global state library — each screen fetches its own data
- Push notifications are not yet implemented (can be added later with `expo-notifications`)
