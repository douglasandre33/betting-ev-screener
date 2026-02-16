# Math Notes — Expected Value and Vig Removal

## American odds ↔ implied probability
For American odds `A`:

- If `A > 0`: `p = 100 / (A + 100)`
- If `A < 0`: `p = |A| / (|A| + 100)`

Reverse mapping from fair probability `p`:

- If `p >= 0.5`: `A = -100 * p / (1 - p)`
- If `p < 0.5`: `A = 100 * (1 - p) / p`

## Vig removal (two-way market)
Given raw implied probs from a sharp (or proxy sharp) two-way market: `p1_raw`, `p2_raw`

1. Compute overround: `S = p1_raw + p2_raw`
2. Normalize:
   - `p1_fair = p1_raw / S`
   - `p2_fair = p2_raw / S`

This is the proportional normalization method and is the standard MVP approach for two-way markets.

## EV%
Given offered decimal odds `d` and fair win probability `p_fair`:

`EV = p_fair * (d - 1) - (1 - p_fair)`

`EV% = EV * 100`

A bet is flagged +EV when `EV% >= MIN_EV_PERCENT` (default `1.0`).
