const navItems = ['Dashboard', 'Markets', 'Model'];

export function Dashboard(): JSX.Element {
  return (
    <main className="mx-auto min-h-screen max-w-6xl p-6">
      <header className="mb-8 flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h1 className="text-xl font-semibold">Betting EV Screener</h1>
        <nav aria-label="Primary">
          <ul className="flex gap-6 text-sm text-slate-600">
            {navItems.map((item) => (
              <li key={item} className="font-medium">
                {item}
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm" aria-label="Dashboard table">
        <h2 className="mb-4 text-lg font-medium">Opportunities</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="px-3 py-2 font-medium">Sport</th>
                <th className="px-3 py-2 font-medium">Market</th>
                <th className="px-3 py-2 font-medium">Book</th>
                <th className="px-3 py-2 font-medium">EV %</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="px-3 py-8 text-center text-slate-500" colSpan={4}>
                  No data yet. Connect odds providers and run pricing models.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
