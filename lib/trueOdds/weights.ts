export const TRUE_ODDS_WEIGHTS = {
  pinnacle: 0.3,
  circa: 0.25,
  betcris: 0.2,
  draftkings: 0.1,
  fanduel: 0.1,
  betmgm: 0.05
} as const;

export type CanonicalWeightedBook = keyof typeof TRUE_ODDS_WEIGHTS;

const ALIAS_TO_CANONICAL: Record<string, CanonicalWeightedBook> = {
  pinnacle: 'pinnacle',

  circa: 'circa',
  cris: 'betcris',
  'circa sports': 'circa',

  betcris: 'betcris',
  bookmaker: 'betcris',

  draftkings: 'draftkings',
  dk: 'draftkings',

  fanduel: 'fanduel',
  fd: 'fanduel',

  betmgm: 'betmgm',
  mgm: 'betmgm'
};

function normalizeBookString(value: string): string {
  return value.toLowerCase().trim().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
}

export function normalizeWeightedBookKey(rawBookKey: string, rawBookName?: string): CanonicalWeightedBook | null {
  const candidates = [rawBookKey, rawBookName].filter((item): item is string => Boolean(item));

  for (const candidate of candidates) {
    const normalized = normalizeBookString(candidate);
    const canonical = ALIAS_TO_CANONICAL[normalized];
    if (canonical) {
      return canonical;
    }
  }

  return null;
}
