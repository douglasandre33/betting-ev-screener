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

export type BlendedTrueOddsResult = {
  fairProbability: number;
  fairAmericanOdds: number;
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

export function blendTrueOdds(offers: TrueOddsOffer[]): BlendedTrueOddsResult | null {
  if (offers.length === 0) {
    return null;
  }

  const uniqueByBook = new Map<CanonicalWeightedBook, TrueOddsOffer>();
  for (const offer of offers) {
    if (!uniqueByBook.has(offer.book)) {
      uniqueByBook.set(offer.book, offer);
    }
  }

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
