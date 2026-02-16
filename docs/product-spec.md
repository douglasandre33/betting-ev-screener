# Product Spec — +EV Odds Screen MVP

## Goal
Provide an end-to-end odds screen that ingests real free-source odds, computes fair prices, and surfaces +EV opportunities.

## User Outcome
A user can press **Refresh odds now** and see a ranked table of +EV opportunities.

## Scope
- Real odds fetch + normalization layer.
- Snapshot persistence with timestamps.
- Fair pricing using sharp/proxy reference.
- EV computation and thresholding (`>= 1.0%` default).
- Dashboard filters and search.
- Background dev refresh loop (60s).

## Non-goals
- Arbitrage execution.
- Account linking to books.
- Non-two-way market vig models (deferred).

## Acceptance Behavior
- `npm run dev` starts app and ensures schema is pushed.
- `/dashboard` renders filterable opportunities table.
- Clicking **Refresh odds now** fetches latest odds and stores snapshots.
