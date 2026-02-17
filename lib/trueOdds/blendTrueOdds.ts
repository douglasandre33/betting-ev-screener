import {
  americanOddsToImpliedProbability,
  impliedProbabilityToAmericanOdds,
  removeVigTwoWay
} from '@/lib/math/expectedValue';
import { CanonicalWeightedBook, TRUE_ODDS_WEIGHTS } from '@/lib/trueOdds/weights';

export type TrueOddsOffer = {
  book: CanonicalWeightedBook;
  americanOdds: number;
  oppositeAmericanOdds?: number;
};

export type TwoWayBookOffer = {
  book: CanonicalWeightedBook;
  sideAAmericanOdds: number;
  sideBAmericanOdds: number;
};

export type BlendedTrueOddsResult = {
  fairProbability: number;
  fairAmericanOdds: number;
  contributingBooks: CanonicalWeightedBook[];
};

export type BlendedTwoWayTrueOddsResult = {
  sideAFairProbability: number;
  sideBFairProbability: number;
  sideAFairAmericanOdds: number;
  sideBFairAmericanOdds: number;
  contributingBooks: CanonicalWeightedBook[];
};

function toDeviggedSelectionProbability(offer: TrueOddsOffer): number {
  const selectionProbability = americanOddsToImpliedProbability(offer.americanOdds);

  if (offer.oppositeAmericanOdds === undefined) {
    return selectionProbability;
  }

  const oppositeProbability = americanOddsToImpliedProbability(offer.oppositeAmericanOdds);

  return removeVigTwoWay(selectionProbability, oppositeProbability).fairA;
}

function uniqueOffersByBook(offers: TrueOddsOffer[]): Map<CanonicalWeightedBook, TrueOddsOffer> {
  const uniqueByBook = new Map<CanonicalWeightedBook, TrueOddsOffer>();

  for (const offer of offers) {
    if (!uniqueByBook.has(offer.book)) {
      uniqueByBook.set(offer.book, offer);
    }
  }

  return uniqueByBook;
}

export function blendTrueOdds(offers: TrueOddsOffer[]): BlendedTrueOddsResult | null {
  if (offers.length === 0) {
    return null;
  }

  const uniqueByBook = uniqueOffersByBook(offers);
  let weightedProbabilityTotal = 0;
  let totalWeight = 0;
  const contributingBooks: CanonicalWeightedBook[] = [];

  for (const [book, offer] of uniqueByBook.entries()) {
    const weight = TRUE_ODDS_WEIGHTS[book];
    const fairProbability = toDeviggedSelectionProbability(offer);

    weightedProbabilityTotal += fairProbability * weight;
    totalWeight += weight;
    contributingBooks.push(book);
  }

  if (totalWeight <= 0) {
    return null;
  }

  const fairProbability = weightedProbabilityTotal / totalWeight;

  return {
    fairProbability,
    fairAmericanOdds: impliedProbabilityToAmericanOdds(fairProbability),
    contributingBooks
  };
}

export function blendTwoWayTrueOdds(offers: TwoWayBookOffer[]): BlendedTwoWayTrueOddsResult | null {
  if (offers.length === 0) {
    return null;
  }

  const sideAOffers: TrueOddsOffer[] = offers.map((offer) => ({
    book: offer.book,
    americanOdds: offer.sideAAmericanOdds,
    oppositeAmericanOdds: offer.sideBAmericanOdds
  }));

  const sideBOffers: TrueOddsOffer[] = offers.map((offer) => ({
    book: offer.book,
    americanOdds: offer.sideBAmericanOdds,
    oppositeAmericanOdds: offer.sideAAmericanOdds
  }));

  const sideA = blendTrueOdds(sideAOffers);
  const sideB = blendTrueOdds(sideBOffers);

  if (!sideA || !sideB) {
    return null;
  }

  const total = sideA.fairProbability + sideB.fairProbability;
  const sideAFairProbability = sideA.fairProbability / total;
  const sideBFairProbability = sideB.fairProbability / total;

  return {
    sideAFairProbability,
    sideBFairProbability,
    sideAFairAmericanOdds: impliedProbabilityToAmericanOdds(sideAFairProbability),
    sideBFairAmericanOdds: impliedProbabilityToAmericanOdds(sideBFairProbability),
    contributingBooks: [...new Set([...sideA.contributingBooks, ...sideB.contributingBooks])]
  };
}
