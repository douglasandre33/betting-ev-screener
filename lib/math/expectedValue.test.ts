import { describe, expect, it } from 'vitest';

import {
  americanOddsToImpliedProbability,
  americanToDecimalOdds,
  calculateExpectedValuePercent,
  decimalToAmericanOdds,
  impliedProbabilityToAmericanOdds,
  removeVigTwoWay
} from './expectedValue';

describe('odds conversion math', () => {
  it('converts positive american odds into implied probability', () => {
    expect(americanOddsToImpliedProbability(150)).toBeCloseTo(0.4, 5);
  });

  it('converts negative american odds into implied probability', () => {
    expect(americanOddsToImpliedProbability(-110)).toBeCloseTo(0.52381, 5);
  });

  it('converts implied probability into american odds', () => {
    expect(impliedProbabilityToAmericanOdds(0.4)).toBe(150);
    expect(impliedProbabilityToAmericanOdds(0.6)).toBe(-150);
  });

  it('converts between american and decimal odds', () => {
    expect(americanToDecimalOdds(150)).toBeCloseTo(2.5, 5);
    expect(americanToDecimalOdds(-200)).toBeCloseTo(1.5, 5);
    expect(decimalToAmericanOdds(2.5)).toBe(150);
    expect(decimalToAmericanOdds(1.5)).toBe(-200);
  });
});

describe('vig removal and EV', () => {
  it('removes vig from a two-way market', () => {
    const { fairA, fairB } = removeVigTwoWay(0.5238, 0.5238);

    expect(fairA).toBeCloseTo(0.5, 3);
    expect(fairB).toBeCloseTo(0.5, 3);
    expect(fairA + fairB).toBeCloseTo(1, 5);
  });

  it('calculates EV percent from fair probability and offered odds', () => {
    expect(calculateExpectedValuePercent(110, 0.5)).toBeCloseTo(5, 3);
  });

  it('throws on invalid probability bounds', () => {
    expect(() => impliedProbabilityToAmericanOdds(0)).toThrowError();
    expect(() => calculateExpectedValuePercent(110, 1)).toThrowError();
  });
});
