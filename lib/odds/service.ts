import { OddsSnapshot } from '@prisma/client';

import { prisma } from '@/lib/db/prisma';
import {
  americanOddsToImpliedProbability,
  calculateExpectedValuePercent,
  impliedProbabilityToAmericanOdds,
  removeVigTwoWay
} from '@/lib/math/expectedValue';
import { fetchNormalizedOdds } from '@/lib/odds/fetchOdds';

type SnapshotRow = OddsSnapshot & {
  book: { id: number; key: string; name: string; isSharp: boolean };
  market: { id: number; key: string; event: { sportTitle: string; homeTeam: string; awayTeam: string } };
};

type SelectionFairPrice = {
  marketId: number;
  selectionName: string;
  fairProbability: number;
  fairAmericanOdds: number;
};

export type OpportunityRow = {
  id: string;
  sport: string;
  event: string;
  market: string;
  selection: string;
  book: string;
  odds: number;
  fairOdds: number;
  evPercent: number;
  updatedAt: Date;
};

export type OpportunityFilters = {
  sport?: string;
  book?: string;
  minEvPercent?: number;
  query?: string;
};

const SHARP_BOOK_KEY = (process.env.SHARP_BOOK_KEY ?? 'pinnacle').toLowerCase();
const MIN_EV_THRESHOLD_PERCENT = Number(process.env.MIN_EV_PERCENT ?? '1');

function toEventLabel(homeTeam: string, awayTeam: string): string {
  return `${awayTeam} @ ${homeTeam}`;
}

function mapLatestSnapshotsByMarketBook(snapshots: SnapshotRow[]): Map<string, SnapshotRow[]> {
  const grouped = new Map<string, SnapshotRow[]>();

  for (const snapshot of snapshots) {
    const key = `${snapshot.marketId}::${snapshot.bookId}`;
    const group = grouped.get(key) ?? [];
    group.push(snapshot);
    grouped.set(key, group);
  }

  return grouped;
}

function selectReferenceBookRows(bookRows: SnapshotRow[][]): { rows: SnapshotRow[]; isProxy: boolean } | null {
  const sharpRows = bookRows.find((rows) => rows[0].book.key.toLowerCase() === SHARP_BOOK_KEY);
  if (sharpRows) {
    return { rows: sharpRows, isProxy: false };
  }

  const proxyRows = [...bookRows].sort((a, b) => {
    const aSum =
      americanOddsToImpliedProbability(a[0].oddsAmerican) + americanOddsToImpliedProbability(a[1].oddsAmerican);
    const bSum =
      americanOddsToImpliedProbability(b[0].oddsAmerican) + americanOddsToImpliedProbability(b[1].oddsAmerican);

    return aSum - bSum;
  })[0];

  return proxyRows ? { rows: proxyRows, isProxy: true } : null;
}

function buildFairPriceIndex(groupedByMarketBook: Map<string, SnapshotRow[]>): {
  fairByMarketSelection: Map<string, SelectionFairPrice>;
  proxySnapshotIds: number[];
} {
  const byMarket = new Map<number, SnapshotRow[][]>();

  for (const snapshots of groupedByMarketBook.values()) {
    if (snapshots.length !== 2) {
      continue;
    }

    const marketId = snapshots[0].marketId;
    const existing = byMarket.get(marketId) ?? [];
    existing.push(snapshots);
    byMarket.set(marketId, existing);
  }

  const fairByMarketSelection = new Map<string, SelectionFairPrice>();
  const proxySnapshotIds: number[] = [];

  for (const [marketId, bookSelections] of byMarket.entries()) {
    const reference = selectReferenceBookRows(bookSelections);
    if (!reference) {
      continue;
    }

    const first = reference.rows[0];
    const second = reference.rows[1];
    const p1 = americanOddsToImpliedProbability(first.oddsAmerican);
    const p2 = americanOddsToImpliedProbability(second.oddsAmerican);
    const fair = removeVigTwoWay(p1, p2);

    fairByMarketSelection.set(`${marketId}::${first.selectionName}`, {
      marketId,
      selectionName: first.selectionName,
      fairProbability: fair.fairA,
      fairAmericanOdds: impliedProbabilityToAmericanOdds(fair.fairA)
    });

    fairByMarketSelection.set(`${marketId}::${second.selectionName}`, {
      marketId,
      selectionName: second.selectionName,
      fairProbability: fair.fairB,
      fairAmericanOdds: impliedProbabilityToAmericanOdds(fair.fairB)
    });

    if (reference.isProxy) {
      proxySnapshotIds.push(first.id, second.id);
    }
  }

  return { fairByMarketSelection, proxySnapshotIds };
}

async function loadSnapshotsAt(fetchedAt: Date): Promise<SnapshotRow[]> {
  return prisma.oddsSnapshot.findMany({
    where: { fetchedAt },
    include: {
      book: {
        select: {
          id: true,
          key: true,
          name: true,
          isSharp: true
        }
      },
      market: {
        select: {
          id: true,
          key: true,
          event: {
            select: {
              sportTitle: true,
              homeTeam: true,
              awayTeam: true
            }
          }
        }
      }
    }
  });
}

export async function refreshOddsAndStore(): Promise<{ insertedRows: number; fetchedAt: Date }> {
  const fetchedAt = new Date();
  const records = await fetchNormalizedOdds();

  for (const record of records) {
    const isSharp = record.bookKey.toLowerCase() === SHARP_BOOK_KEY;

    const book = await prisma.book.upsert({
      where: { key: record.bookKey },
      update: { name: record.bookName, isSharp },
      create: { key: record.bookKey, name: record.bookName, isSharp },
      select: { id: true }
    });

    const event = await prisma.event.upsert({
      where: { externalId: record.externalEventId },
      update: {
        sportKey: record.sportKey,
        sportTitle: record.sportTitle,
        homeTeam: record.homeTeam,
        awayTeam: record.awayTeam,
        commenceTime: record.commenceTime
      },
      create: {
        externalId: record.externalEventId,
        sportKey: record.sportKey,
        sportTitle: record.sportTitle,
        homeTeam: record.homeTeam,
        awayTeam: record.awayTeam,
        commenceTime: record.commenceTime
      },
      select: { id: true }
    });

    const market = await prisma.market.upsert({
      where: {
        eventId_key: {
          eventId: event.id,
          key: record.marketKey
        }
      },
      update: {},
      create: {
        eventId: event.id,
        key: record.marketKey
      },
      select: { id: true }
    });

    await prisma.oddsSnapshot.create({
      data: {
        marketId: market.id,
        bookId: book.id,
        selectionName: record.selectionName,
        oddsAmerican: record.oddsAmerican,
        fetchedAt,
        source: record.source,
        isProxySharp: false
      }
    });
  }

  const snapshots = await loadSnapshotsAt(fetchedAt);
  const grouped = mapLatestSnapshotsByMarketBook(snapshots);
  const { proxySnapshotIds } = buildFairPriceIndex(grouped);

  if (proxySnapshotIds.length > 0) {
    await prisma.oddsSnapshot.updateMany({
      where: {
        id: {
          in: proxySnapshotIds
        }
      },
      data: { isProxySharp: true }
    });
  }

  return { insertedRows: records.length, fetchedAt };
}

export async function getOpportunities(filters: OpportunityFilters): Promise<OpportunityRow[]> {
  const latest = await prisma.oddsSnapshot.findFirst({
    orderBy: { fetchedAt: 'desc' },
    select: { fetchedAt: true }
  });

  if (!latest) {
    return [];
  }

  const snapshots = await loadSnapshotsAt(latest.fetchedAt);
  const groupedByMarketBook = mapLatestSnapshotsByMarketBook(snapshots);
  const { fairByMarketSelection } = buildFairPriceIndex(groupedByMarketBook);

  const rows: OpportunityRow[] = [];
  for (const snapshot of snapshots) {
    const fair = fairByMarketSelection.get(`${snapshot.marketId}::${snapshot.selectionName}`);
    if (!fair) {
      continue;
    }

    const evPercent = calculateExpectedValuePercent(snapshot.oddsAmerican, fair.fairProbability);
    if (evPercent < (filters.minEvPercent ?? MIN_EV_THRESHOLD_PERCENT)) {
      continue;
    }

    const sport = snapshot.market.event.sportTitle;
    const book = snapshot.book.name;
    const eventLabel = toEventLabel(snapshot.market.event.homeTeam, snapshot.market.event.awayTeam);

    if (filters.sport && filters.sport !== 'all' && sport !== filters.sport) {
      continue;
    }

    if (filters.book && filters.book !== 'all' && book !== filters.book) {
      continue;
    }

    if (filters.query) {
      const query = filters.query.toLowerCase();
      if (!eventLabel.toLowerCase().includes(query) && !snapshot.selectionName.toLowerCase().includes(query)) {
        continue;
      }
    }

    rows.push({
      id: `${snapshot.id}`,
      sport,
      event: eventLabel,
      market: snapshot.market.key,
      selection: snapshot.selectionName,
      book,
      odds: snapshot.oddsAmerican,
      fairOdds: fair.fairAmericanOdds,
      evPercent,
      updatedAt: snapshot.fetchedAt
    });
  }

  return rows.sort((a, b) => b.evPercent - a.evPercent);
}

export async function getFilterOptions(): Promise<{ sports: string[]; books: string[] }> {
  const latest = await prisma.oddsSnapshot.findFirst({
    orderBy: { fetchedAt: 'desc' },
    select: { fetchedAt: true }
  });

  if (!latest) {
    return { sports: [], books: [] };
  }

  const snapshots = await loadSnapshotsAt(latest.fetchedAt);
  const sports = [...new Set(snapshots.map((item) => item.market.event.sportTitle))].sort();
  const books = [...new Set(snapshots.map((item) => item.book.name))].sort();

  return { sports, books };
}
