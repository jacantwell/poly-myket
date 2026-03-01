# Poly-Myket — Project Spec

A social betting webapp where groups of friends bet on each other's real-life commitments using a simple credit system.

## Core Flow

1. Create or join a group with friends (via invite code)
2. A member creates a bet targeting someone: _"Joe will build his IKEA shelf by Friday 6pm"_
3. Group members bet credits on Yes or No
4. When the deadline hits, the **subject** of the bet (Joe) resolves it honestly (honor system)
5. Credits are distributed proportionally to winners

## Features

### Groups
- Create a group with a name
- Join via invite code
- View all active and past bets in a group

### Bets
- A bet has: a subject (who), a description (what), and a deadline (when)
- Any group member can create a bet about any other member
- Group members place Yes/No wagers using credits
- The subject of the bet cannot bet on themselves
- Once the deadline passes, only the subject can resolve (completed / failed)
- Optional photo attachment on resolution (bragging rights)

### Credits
- Every user starts with a balance (100 credits)
- Zero-sum payouts: losers' credits go to winners, proportional to their wager
- Groups decide offline what credits represent (e.g. 10 credits = a pint)

### Notifications (via Resend)
- New bet created in your group
- Bet deadline approaching (e.g. 1 hour before)
- Bet resolved — payout summary

### Auth
- Email-based magic link authentication via Resend

## Tech Stack

| Layer          | Technology        |
|----------------|-------------------|
| Frontend       | NextJS + ShadCN   |
| Backend        | Python (FastAPI)  |
| Database       | PostgreSQL        |
| Auth           | Email magic links (Resend) |
| Notifications  | Resend            |

## Data Model

### User
- id, email, display_name, created_at

### Group
- id, name, invite_code, created_at

### GroupMember
- id, group_id, user_id, credit_balance (default 100), joined_at

### Bet
- id, group_id, created_by (user_id), subject_id (user_id)
- description, deadline, status (open | resolved_success | resolved_fail | cancelled)
- proof_image_url (optional), resolved_at, created_at

### Wager
- id, bet_id, user_id, amount, side (yes | no), created_at

## API Routes

### Auth
- `POST /auth/magic-link` — send magic link email
- `GET /auth/verify` — verify token from magic link, return session

### Users
- `GET /users/me` — current user profile

### Groups
- `POST /groups` — create group
- `POST /groups/join` — join via invite code
- `GET /groups` — list my groups
- `GET /groups/{id}` — group detail with members

### Bets
- `POST /groups/{id}/bets` — create a bet
- `GET /groups/{id}/bets` — list bets in group (filterable by status)
- `POST /bets/{id}/resolve` — subject resolves the bet (success/fail, optional photo)

### Wagers
- `POST /bets/{id}/wagers` — place a wager (yes/no + amount)

## Payout Logic

When a bet resolves:
1. Determine the winning side (yes if resolved_success, no if resolved_fail)
2. Total losing pool = sum of all losing wagers
3. Each winner receives a share of the losing pool proportional to their wager size
4. Credits are updated on each GroupMember record
