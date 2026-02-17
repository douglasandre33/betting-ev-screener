import { describe, expect, it } from 'vitest';

import { blendTrueOdds, blendTwoWayTrueOdds } from '@/lib/trueOdds/blendTrueOdds';

describe('blendTrueOdds', () => {
  it('blends fair probability when all weighted books are present', () => {
    const result = blendTrueOdds([
      { book: 'pinnacle', americanOdds: -110, oppositeAmericanOdds: -110 },
      { book: 'circa', americanOdds: -105, oppositeAmericanOdds: -115 },
      { book: 'betcris', americanOdds: -108, oppositeAmericanOdds: -112 },
      { book: 'draftkings', americanOdds: 100, oppositeAmericanOdds: -120 },
      { book: 'fanduel', americanOdds: -102, oppositeAmericanOdds: -118 },
      { book: 'betmgm', americanOdds: -101, oppositeAmericanOdds: -119 }
    ]);

    expect(result).not.toBeNull();
    expect(result?.fairProbability).toBeCloseTo(0.49154, 5);
    expect(result?.fairAmericanOdds).toBe(103);
    expect(result?.contributingBooks.length).toBe(6);
  });

  it('renormalizes weights when some books are missing', () => {
    const result = blendTrueOdds([
      { book: 'pinnacle', americanOdds: -110, oppositeAmericanOdds: -110 },
      { book: 'circa', americanOdds: -105, oppositeAmericanOdds: -115 },
      { book: 'betcris', americanOdds: -108, oppositeAmericanOdds: -112 }
    ]);

    expect(result).not.toBeNull();
    expect(result?.fairProbability).toBeCloseTo(0.49523, 5);
    expect(result?.fairAmericanOdds).toBe(102);
  });

  it('de-vigs two-sided markets so side probabilities sum to one', () => {
    const sideA = blendTrueOdds([
      { book: 'pinnacle', americanOdds: -110, oppositeAmericanOdds: -110 },
      { book: 'circa', americanOdds: -105, oppositeAmericanOdds: -115 },
      { book: 'betcris', americanOdds: -108, oppositeAmericanOdds: -112 }
    ]);

    const sideB = blendTrueOdds([
      { book: 'pinnacle', americanOdds: -110, oppositeAmericanOdds: -110 },
      { book: 'circa', americanOdds: -115, oppositeAmericanOdds: -105 },
      { book: 'betcris', americanOdds: -112, oppositeAmericanOdds: -108 }
    ]);

    expect(sideA).not.toBeNull();
    expect(sideB).not.toBeNull();
    expect((sideA?.fairProbability ?? 0) + (sideB?.fairProbability ?? 0)).toBeCloseTo(1, 5);
  });
});

describe('blendTwoWayTrueOdds', () => {
  it('returns fair probabilities that sum exactly to one after normalization', () => {
    const result = blendTwoWayTrueOdds([
      { book: 'pinnacle', sideAAmericanOdds: -110, sideBAmericanOdds: -110 },
      { book: 'circa', sideAAmericanOdds: -105, sideBAmericanOdds: -115 },
      { book: 'betcris', sideAAmericanOdds: -108, sideBAmericanOdds: -112 }
    ]);

    expect(result).not.toBeNull();
    expect((result?.sideAFairProbability ?? 0) + (result?.sideBFairProbability ?? 0)).toBeCloseTo(1, 10);
    expect(result?.sideAFairAmericanOdds).toBe(102);
    expect(result?.sideBFairAmericanOdds).toBe(-102);
  });
});
