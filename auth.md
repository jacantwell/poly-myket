# Clerk Auth Integration

## Architecture

```
Frontend (Clerk SDK)
    │
    ▼
Clerk handles sign-in (Google OAuth)
    │
    ▼
Clerk issues session JWT (RS256, signed with Clerk's private key)
    │
    ▼
Frontend calls getToken() per API request
    │
    ▼
Bearer token sent to FastAPI backend
    │
    ▼
Backend verifies JWT via Clerk JWKS endpoint (RS256 public keys)
    │
    ▼
Backend extracts clerk_id (sub), email, name from JWT claims
    │
    ▼
Backend looks up or auto-creates User by clerk_id
```

## Sign-in Flow

1. User clicks "Sign in with Google" on the Clerk `<SignIn />` component
2. Clerk handles the full OAuth flow (redirects, token exchange, etc.)
3. Clerk issues a short-lived session JWT (~60s TTL)
4. Frontend sends JWT as `Authorization: Bearer <token>` on every API request
5. Backend verifies the JWT signature against Clerk's JWKS endpoint
6. On first login, the backend auto-creates a `User` record using claims from the JWT

## User Mapping

- **Clerk** owns identity (authentication, OAuth, sessions)
- **Backend** stores `clerk_id` (Clerk's `sub` claim) on the `User` model
- `clerk_id` is unique and indexed — used to link Clerk identity to the internal UUID-based User
- `email` and `display_name` are populated from JWT claims on first login

## Token Lifecycle

- Clerk auto-refreshes short-lived tokens (~60s expiry)
- Frontend calls `useAuth().getToken()` before each API request (returns cached or refreshed token)
- No tokens are stored in `localStorage` — Clerk manages session state
- Backend is stateless — verifies each token via JWKS on every request

## Clerk Dashboard Setup

1. **Enable Google OAuth**: Clerk Dashboard → User & Authentication → Social Connections → Enable Google
2. **Create JWT Template**: Clerk Dashboard → JWT Templates → Create template
   - Add `email` and `name` claims so the backend can auto-create users
   - Template should include `sub` (clerk_id), `email`, and `name` in the payload

## Environment Variables

### Backend
- `CLERK_JWKS_URL` — Clerk's JWKS endpoint (e.g. `https://<your-clerk-domain>/.well-known/jwks.json`)

### Frontend
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` — Clerk publishable key (public)
- `CLERK_SECRET_KEY` — Clerk secret key (server-side only)
- `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in`
- `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up`
- `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/groups`
- `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/groups`

## Route Protection

- `proxy.ts` (Next.js 16 middleware) uses `clerkMiddleware` to protect `/groups(.*)` and `/bets(.*)`
- Unauthenticated users are redirected to `/sign-in`
- Public routes: `/`, `/sign-in`, `/sign-up`
