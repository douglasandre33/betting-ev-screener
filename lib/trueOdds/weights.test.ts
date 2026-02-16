import { describe, expect, it } from 'vitest';

import { normalizeWeightedBookKey } from '@/lib/trueOdds/weights';

describe('normalizeWeightedBookKey', () => {
  it('maps required aliases to canonical books', () => {
    expect(normalizeWeightedBookKey('pinnacle')).toBe('pinnacle');
    expect(normalizeWeightedBookKey('Circa Sports')).toBe('circa');
    expect(normalizeWeightedBookKey('CRIS')).toBe('betcris');
    expect(normalizeWeightedBookKey('Bookmaker')).toBe('betcris');
    expect(normalizeWeightedBookKey('DK')).toBe('draftkings');
    expect(normalizeWeightedBookKey('FD')).toBe('fanduel');
    expect(normalizeWeightedBookKey('MGM')).toBe('betmgm');
  });

  it('uses book name when key is not recognized', () => {
    expect(normalizeWeightedBookKey('unknown-key', 'BetCRIS')).toBe('betcris');
  });
});
