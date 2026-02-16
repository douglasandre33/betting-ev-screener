# Betting EV Screener

Vertical-slice MVP for finding +EV betting opportunities from free odds data.

## Setup

1. Copy env file and configure your free odds API key:

```bash
cp .env.example .env
```

2. Install and run:

```bash
npm install
npm run dev
```

App will be available at http://localhost:3000/dashboard.

## How it works

- Click **Refresh odds now** to fetch and store latest odds snapshots.
- Fair probabilities are derived from a sharp reference market (Pinnacle if available, otherwise proxy sharp by lowest overround).
- Bets are marked +EV when `EV% >= MIN_EV_PERCENT` (default `1.0`).

## Scripts

- `npm run lint`
- `npm run test:run`
- `npm run test:smoke`
- `npm run prisma:push`

## Branching

- `main`: baseline branch
- `dev`: integration branch
- feature branches merge into `dev` via PR
