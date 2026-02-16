export type NormalizedOddsRecord = {
  source: 'the-odds-api';
  externalEventId: string;
  sportKey: string;
  sportTitle: string;
  commenceTime: Date;
  homeTeam: string;
  awayTeam: string;
  marketKey: string;
  bookKey: string;
  bookName: string;
  selectionName: string;
  oddsAmerican: number;
};
