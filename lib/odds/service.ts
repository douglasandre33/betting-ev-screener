import { OddsSnapshot } from '@prisma/client';

import { prisma } from '@/lib/db/prisma';
import { calculateExpectedValuePercent } from '@/lib/math/expectedValue';
import { fetchNormalizedOdds } from '@/lib/odds/fetchOdds';
import { blendTrueOdds, TrueOddsOffer } from '@/lib/trueOdds/blendTrueOdds';
import { normalizeWeightedBookKey } from '@/lib/trueOdds/weights';

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

function buildFairPriceIndex(groupedByMarketBook: Map<string, SnapshotRow[]>): Map<string, SelectionFairPrice> {
  const byMarket = new Map<number, SnapshotRow[][]>();

  for (const bookRows of groupedByMarketBook.values()) {
    if (bookRows.length !== 2) {
      continue;
    }

    const marketId = bookRows[0].marketId;
    const existing = byMarket.get(marketId) ?? [];
    existing.push(bookRows);
    byMarket.set(marketId, existing);
  }

  const fairByMarketSelection = new Map<string, SelectionFairPrice>();

  for (const [marketId, marketBookRows] of byMarket.entries()) {
    const offersBySelection = new Map<string, TrueOddsOffer[]>();

    for (const bookRows of marketBookRows) {
      const canonicalBook = normalizeWeightedBookKey(bookRows[0].book.key, bookRows[0].book.name);
      if (!canonicalBook) {
        continue;
      }

      const first = bookRows[0];
      const second = bookRows[1];

      const firstOffers = offersBySelection.get(first.selectionName) ?? [];
      firstOffers.push({
        book: canonicalBook,
        americanOdds: first.oddsAmerican,
        oppositeAmericanOdds: second.oddsAmerican
      });
      offersBySelection.set(first.selectionName, firstOffers);

      const secondOffers = offersBySelection.get(second.selectionName) ?? [];
      secondOffers.push({
        book: canonicalBook,
        americanOdds: second.oddsAmerican,
        oppositeAmericanOdds: first.oddsAmerican
      });
      offersBySelection.set(second.selectionName, secondOffers);
    }

    for (const [selectionName, offers] of offersBySelection.entries()) {
      const blended = blendTrueOdds(offers);
      if (!blended) {
        continue;
      }

      fairByMarketSelection.set(`${marketId}::${selectionName}`, {
        marketId,
        selectionName,
        fairProbability: blended.fairProbability,
        fairAmericanOdds: blended.fairAmericanOdds
      });
    }
  }

  return fairByMarketSelection;
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
    const canonicalKey = normalizeWeightedBookKey(record.bookKey, record.bookName);
    const normalizedBookKey = canonicalKey ?? record.bookKey.toLowerCase();
    const isSharp = normalizedBookKey === 'pinnacle';

    const book = await prisma.book.upsert({
      where: { key: normalizedBookKey },
      update: { name: record.bookName, isSharp },
      create: { key: normalizedBookKey, name: record.bookName, isSharp },
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
  const fairByMarketSelection = buildFairPriceIndex(groupedByMarketBook);

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
