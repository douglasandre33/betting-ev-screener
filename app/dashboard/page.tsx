import Link from 'next/link';

import { ensureDevBackgroundRefresh } from '@/lib/odds/backgroundRefresh';
import { getFilterOptions, getOpportunities } from '@/lib/odds/service';

import { refreshOddsAction } from './actions';
import { RefreshButton } from './refresh-button';

type DashboardPageProps = {
  searchParams?: {
    sport?: string;
    book?: string;
    minEv?: string;
    query?: string;
  };
};

function formatAmerican(odds: number): string {
  return odds > 0 ? `+${odds}` : `${odds}`;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps): Promise<JSX.Element> {
  ensureDevBackgroundRefresh();

  const minEv = Number(searchParams?.minEv ?? process.env.MIN_EV_PERCENT ?? '1');
  const filters = {
    sport: searchParams?.sport,
    book: searchParams?.book,
    minEvPercent: Number.isFinite(minEv) ? minEv : 1,
    query: searchParams?.query
  };

  const [rows, options] = await Promise.all([getOpportunities(filters), getFilterOptions()]);

  return (
    <main className="mx-auto min-h-screen max-w-7xl p-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div>
          <h1 className="text-xl font-semibold">+EV Dashboard</h1>
          <p className="text-sm text-slate-600">Free-source odds ingest with sharp/proxy fair pricing.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/" className="text-sm text-slate-600 underline">
            Home
          </Link>
          <RefreshButton action={refreshOddsAction} />
        </div>
      </header>

      <section className="mb-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <form className="grid grid-cols-1 gap-3 md:grid-cols-4" method="get">
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Sport</span>
            <select name="sport" defaultValue={filters.sport ?? 'all'} className="w-full rounded border p-2">
              <option value="all">All sports</option>
              {options.sports.map((sport) => (
                <option key={sport} value={sport}>
                  {sport}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Book</span>
            <select name="book" defaultValue={filters.book ?? 'all'} className="w-full rounded border p-2">
              <option value="all">All books</option>
              {options.books.map((book) => (
                <option key={book} value={book}>
                  {book}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Min EV %</span>
            <input
              name="minEv"
              type="number"
              step="0.1"
              defaultValue={filters.minEvPercent}
              className="w-full rounded border p-2"
            />
          </label>

          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Search event/team</span>
            <input
              name="query"
              type="text"
              defaultValue={filters.query ?? ''}
              placeholder="Team or event"
              className="w-full rounded border p-2"
            />
          </label>

          <div className="md:col-span-4">
            <button type="submit" className="rounded border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">
              Apply filters
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="px-3 py-2">sport</th>
                <th className="px-3 py-2">event</th>
                <th className="px-3 py-2">market</th>
                <th className="px-3 py-2">selection</th>
                <th className="px-3 py-2">book</th>
                <th className="px-3 py-2">odds</th>
                <th className="px-3 py-2">fair odds</th>
                <th className="px-3 py-2">EV%</th>
                <th className="px-3 py-2">updated time</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-slate-100">
                  <td className="px-3 py-2">{row.sport}</td>
                  <td className="px-3 py-2">{row.event}</td>
                  <td className="px-3 py-2">{row.market}</td>
                  <td className="px-3 py-2">{row.selection}</td>
                  <td className="px-3 py-2">{row.book}</td>
                  <td className="px-3 py-2">{formatAmerican(row.odds)}</td>
                  <td className="px-3 py-2">{formatAmerican(row.fairOdds)}</td>
                  <td className="px-3 py-2 font-medium text-emerald-700">{row.evPercent.toFixed(2)}%</td>
                  <td className="px-3 py-2">{row.updatedAt.toLocaleString()}</td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td className="px-3 py-8 text-center text-slate-500" colSpan={9}>
                    No +EV rows yet. Click “Refresh odds now” to ingest the latest feed.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
