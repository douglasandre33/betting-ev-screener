export function americanOddsToImpliedProbability(americanOdds: number): number {
  if (americanOdds === 0) {
    throw new Error('American odds cannot be 0.');
  }

  if (americanOdds > 0) {
    return 100 / (americanOdds + 100);
  }

  return Math.abs(americanOdds) / (Math.abs(americanOdds) + 100);
}

export function impliedProbabilityToAmericanOdds(probability: number): number {
  if (probability <= 0 || probability >= 1) {
    throw new Error('Probability must be between 0 and 1 (exclusive).');
  }

  if (probability >= 0.5) {
    return Math.round((-100 * probability) / (1 - probability));
  }

  return Math.round((100 * (1 - probability)) / probability);
}

export function americanToDecimalOdds(americanOdds: number): number {
  if (americanOdds === 0) {
    throw new Error('American odds cannot be 0.');
  }

  if (americanOdds > 0) {
    return americanOdds / 100 + 1;
  }

  return 100 / Math.abs(americanOdds) + 1;
}

export function decimalToAmericanOdds(decimalOdds: number): number {
  if (decimalOdds <= 1) {
    throw new Error('Decimal odds must be greater than 1.');
  }

  if (decimalOdds >= 2) {
    return Math.round((decimalOdds - 1) * 100);
  }

  return Math.round(-100 / (decimalOdds - 1));
}

export function removeVigTwoWay(probabilityA: number, probabilityB: number): {
  fairA: number;
  fairB: number;
} {
  if (probabilityA <= 0 || probabilityB <= 0) {
    throw new Error('Probabilities must be positive numbers.');
  }

  const total = probabilityA + probabilityB;

  return {
    fairA: probabilityA / total,
    fairB: probabilityB / total
  };
}

export function calculateExpectedValuePercent(americanOdds: number, fairWinProbability: number): number {
  if (fairWinProbability <= 0 || fairWinProbability >= 1) {
    throw new Error('Fair win probability must be between 0 and 1 (exclusive).');
  }

  const decimalOdds = americanToDecimalOdds(americanOdds);
  const expectedValue = fairWinProbability * (decimalOdds - 1) - (1 - fairWinProbability);

  return expectedValue * 100;
}
