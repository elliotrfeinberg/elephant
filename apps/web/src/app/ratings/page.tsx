// Ratings overview — backed by Postgres. Until match ingestion (phase-2)
// produces computed performance ratings, this surfaces the published NTRP
// band distribution across the section. Per-player perf ratings come later.

import Link from "next/link";
import { listPlayers } from "@/lib/players";

export default async function RatingsPage() {
  let data;
  let loadError: string | undefined;
  try {
    // limit 1 — we only need totals + the band-count aggregate here.
    data = await listPlayers({ limit: 1 });
  } catch (err) {
    loadError = err instanceof Error ? err.message : String(err);
  }
  if (!data) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Ratings</h1>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-medium">Couldn’t reach the database.</p>
          <p className="mt-2">
            Ensure Postgres is running and <code>DATABASE_URL</code> is set in{" "}
            <code>apps/web/.env.local</code>.
          </p>
          {loadError && (
            <p className="mt-2 text-xs text-amber-700">{loadError}</p>
          )}
        </div>
      </div>
    );
  }

  const maxCount = Math.max(1, ...data.bandCounts.map((b) => b.count));
  const rated = data.bandCounts.reduce((s, b) => s + b.count, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Ratings</h1>
        <p className="text-sm text-stone-600">
          Published NTRP distribution for{" "}
          <span className="font-mono">{data.total.toLocaleString()}</span> NorCal
          players (<span className="font-mono">{rated.toLocaleString()}</span>{" "}
          with a current band).
        </p>
      </div>

      <div className="rounded-lg border border-court-200 bg-court-50 p-4 text-sm text-court-900">
        <p className="font-medium">Performance ratings are live for ingested matches.</p>
        <p className="mt-1 text-court-800">
          USTA-style perf NTRP (score-aware, with year-over-year carry-over and
          self-rate confidence weighting) is computed from crawled match
          results.{" "}
          <Link
            href={{ pathname: "/players", query: { sort: "perf" } }}
            className="font-medium text-court-700 underline hover:text-court-900"
          >
            Browse players by perf rating →
          </Link>{" "}
          Coverage grows as more flights are crawled.
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-stone-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-left text-xs uppercase tracking-wide text-stone-500">
            <tr>
              <th className="px-3 py-2">NTRP band</th>
              <th className="px-3 py-2 text-right">Players</th>
              <th className="px-3 py-2 w-1/2">Distribution</th>
            </tr>
          </thead>
          <tbody>
            {data.bandCounts.map((b) => (
              <tr key={b.band} className="border-t border-stone-100">
                <td className="px-3 py-2 font-mono font-medium">
                  {b.band.toFixed(1)}
                </td>
                <td className="px-3 py-2 text-right font-mono text-stone-600">
                  {b.count.toLocaleString()}
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 rounded bg-court-500"
                      style={{ width: `${(b.count / maxCount) * 100}%` }}
                    />
                    <Link
                      href={{ pathname: "/players", query: { band: String(b.band), sort: "name" } }}
                      className="text-xs text-court-700 hover:underline"
                    >
                      view
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
            {data.bandCounts.length === 0 && (
              <tr>
                <td colSpan={3} className="px-3 py-8 text-center text-stone-400">
                  No rated players found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
