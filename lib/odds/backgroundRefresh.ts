import { refreshOddsAndStore } from '@/lib/odds/service';

declare global {
  // eslint-disable-next-line no-var
  var oddsRefreshIntervalStarted: boolean | undefined;
}

export function ensureDevBackgroundRefresh(): void {
  if (process.env.NODE_ENV !== 'development') {
    return;
  }

  if (global.oddsRefreshIntervalStarted) {
    return;
  }

  global.oddsRefreshIntervalStarted = true;

  const run = async (): Promise<void> => {
    try {
      await refreshOddsAndStore();
    } catch (error) {
      console.error('Background odds refresh failed:', error);
    }
  };

  void run();
  setInterval(() => {
    void run();
  }, 60_000);
}
