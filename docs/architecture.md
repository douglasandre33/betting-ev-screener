# Architecture — +EV Vertical Slice MVP

## Stack
- Next.js 14 App Router + TypeScript strict mode.
- Prisma + SQLite for local persistence.
- Tailwind CSS for dashboard UI.
- Vitest for math unit tests.
- Playwright for smoke tests.

## Vertical Slice Flow
1. User opens `/dashboard`.
2. Dashboard server component queries latest normalized odds snapshots from SQLite.
3. User can trigger **Refresh odds now** (server action) to fetch and persist current odds.
4. App chooses sharp reference book (Pinnacle if present) or proxy sharp (lowest-overround two-way market at latest snapshot).
5. Vig is removed from reference prices to estimate fair probabilities.
6. EV% is computed for each offered line.
7. Rows meeting `MIN_EV_PERCENT` are rendered and sorted by EV% descending.

## Data Layer
Tables:
- `Book`
- `Event`
- `Market`
- `OddsSnapshot`

`OddsSnapshot` stores timestamped rows for every pulled line (`fetchedAt`) so historical snapshots are retained.
When a proxy sharp market is used, the selected reference rows are tagged with `isProxySharp=true` for traceability.

## Data Source Strategy (Free-only)
- Primary source: The Odds API free tier (`ODDS_API_KEY` required).
- If Pinnacle is present in returned books, it is used as sharp reference.
- If Pinnacle is unavailable, the app uses the lowest-overround two-way market as a proxy sharp source.

## Limitations / Swap Strategy
- Free tiers can rate-limit and may omit books/markets.
- Pinnacle availability may vary by API plan/region and event.
- If a sportsbook blocks scraping/access, keep the normalized schema contract (`lib/odds/types.ts`) and swap `fetchNormalizedOdds()` to another free API adapter.
