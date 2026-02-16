import { NormalizedOddsRecord } from '@/lib/odds/types';

type OddsApiOutcome = {
  name: string;
  price: number;
};

type OddsApiMarket = {
  key: string;
  outcomes: OddsApiOutcome[];
};

type OddsApiBookmaker = {
  key: string;
  title: string;
  markets: OddsApiMarket[];
};

type OddsApiEvent = {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: OddsApiBookmaker[];
};

function buildOddsApiUrl(): string {
  const apiKey = process.env.ODDS_API_KEY;
  if (!apiKey) {
    throw new Error('ODDS_API_KEY is required to fetch live odds from The Odds API free tier.');
  }

  const baseUrl = process.env.ODDS_API_BASE_URL ?? 'https://api.the-odds-api.com/v4';
  const sportsPath = process.env.ODDS_API_SPORTS_PATH ?? '/sports/upcoming/odds';
  const markets = process.env.ODDS_API_MARKETS ?? 'h2h';
  const regions = process.env.ODDS_API_REGIONS ?? 'us';

  const params = new URLSearchParams({
    apiKey,
    regions,
    markets,
    oddsFormat: 'american',
    dateFormat: 'iso'
  });

  return `${baseUrl}${sportsPath}?${params.toString()}`;
}

export async function fetchNormalizedOdds(): Promise<NormalizedOddsRecord[]> {
  const url = buildOddsApiUrl();
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    },
    cache: 'no-store'
  });

  if (!response.ok) {
    throw new Error(`Failed fetching odds data (${response.status}) from ${url}.`);
  }

  const payload = (await response.json()) as OddsApiEvent[];
  const normalized: NormalizedOddsRecord[] = [];

  for (const event of payload) {
    for (const bookmaker of event.bookmakers ?? []) {
      for (const market of bookmaker.markets ?? []) {
        for (const outcome of market.outcomes ?? []) {
          normalized.push({
            source: 'the-odds-api',
            externalEventId: event.id,
            sportKey: event.sport_key,
            sportTitle: event.sport_title,
            commenceTime: new Date(event.commence_time),
            homeTeam: event.home_team,
            awayTeam: event.away_team,
            marketKey: market.key,
            bookKey: bookmaker.key,
            bookName: bookmaker.title,
            selectionName: outcome.name,
            oddsAmerican: Math.trunc(outcome.price)
          });
        }
      }
    }
  }

  return normalized;
}
