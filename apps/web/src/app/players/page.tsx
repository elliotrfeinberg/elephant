// Players directory — backed by Postgres (players + player_year_ratings).
//
// Phase-1 data: per-year published NTRP band + rating type. Computed perf
// ratings and match history land later (phase-2). Filtering, sorting, and
// band tallies run in SQL so the full ~20k-player section stays fast.

import Link from "next/link";
import { listPlayers, ratingTypeLabel, type PlayerRow } from "@/lib/players";

type SortKey = "name" | "band" | "perf";

function yearsIn(rows: PlayerRow[]): number[] {
  const ys = new Set<number>();
  for (const r of rows) for (const b of r.bands) ys.add(b.year);
  return [...ys].sort((a, b) => a - b);
}

export default async function PlayersPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; q?: string; band?: string }>;
}) {
  const p = await searchParams;
  const sort: SortKey =
    p.sort === "band" ? "band" : p.sort === "perf" ? "perf" : "name";
  const q = (p.q ?? "").trim();
  const band = p.band?.trim() ?? "";

  let data;
  let loadError: string | undefined;
  try {
    data = await listPlayers({ q, band, sort, limit: 200 });
  } catch (err) {
    loadError = err instanceof Error ? err.message : String(err);
  }
  if (!data) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Players</h1>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-medium">Couldn’t reach the database.</p>
          <p className="mt-2">
            Make sure Postgres is up (<code>docker compose up -d</code>) and{" "}
            <code>DATABASE_URL</code> is set in{" "}
            <code>apps/web/.env.local</code>.
          </p>
          {loadError && (
            <p className="mt-2 text-xs text-amber-700">{loadError}</p>
          )}
        </div>
      </div>
    );
  }

  const years = yearsIn(data.rows);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Players</h1>
        <p className="text-sm text-stone-600">
          <span className="font-mono">{data.total.toLocaleString()}</span> NorCal
          players from the published NTRP rating search. Showing{" "}
          <span className="font-mono">{data.shown}</span>
          {data.total > data.shown ? " — refine with search" : ""}. Per-season
          roster bands shown; performance ratings &amp; match history populate
          after match ingestion.
        </p>
      </div>

      <form
        className="flex flex-wrap items-end gap-3 rounded-lg border border-stone-200 bg-stone-50 p-3"
        action="/players"
      >
        <label className="flex flex-col text-xs text-stone-600">
          Name contains
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="search by name…"
            className="mt-1 w-56 rounded border border-stone-300 bg-white px-2 py-1.5 text-sm"
          />
        </label>
        <label className="flex flex-col text-xs text-stone-600">
          Sort by
          <select
            name="sort"
            defaultValue={sort}
            className="mt-1 w-44 rounded border border-stone-300 bg-white px-2 py-1.5 text-sm"
          >
            <option value="name">Name (A → Z)</option>
            <option value="band">Roster band (high → low)</option>
            <option value="perf">Perf rating (high → low)</option>
          </select>
        </label>
        {band && <input type="hidden" name="band" value={band} />}
        <button
          type="submit"
          className="rounded bg-court-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-court-900"
        >
          Apply
        </button>
        <div className="flex flex-col text-xs text-stone-600">
          Band filter
          <div className="mt-1 flex flex-wrap gap-1">
            <BandChip current={band} value="" q={q} sort={sort} label="all" />
            {data.bandCounts.map((b) => (
              <BandChip
                key={b.band}
                current={band}
                value={String(b.band)}
                q={q}
                sort={sort}
                label={`${b.band.toFixed(1)} (${b.count})`}
              />
            ))}
          </div>
        </div>
      </form>

      <div className="overflow-hidden rounded-lg border border-stone-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-left text-xs uppercase tracking-wide text-stone-500">
            <tr>
              <th className="px-3 py-2">Player</th>
              <th className="px-3 py-2">Gender</th>
              {years.map((y) => (
                <th key={y} className="px-3 py-2 text-right">
                  {y} band
                </th>
              ))}
              <th className="px-3 py-2 text-right">Perf NTRP</th>
              <th className="px-3 py-2">Latest type</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((pl) => {
              const latestType =
                pl.bands.length > 0
                  ? pl.bands[pl.bands.length - 1]!.ratingType
                  : null;
              return (
                <tr key={pl.id} className="border-t border-stone-100">
                  <td className="px-3 py-2">
                    <Link
                      href={`/players/${pl.id}` as `/players/${string}`}
                      className="font-medium text-court-700 hover:underline"
                    >
                      {pl.name}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-xs text-stone-500">
                    {pl.gender ?? "—"}
                  </td>
                  {years.map((y) => {
                    const b = pl.bands.find((x) => x.year === y);
                    return (
                      <td
                        key={y}
                        className="px-3 py-2 text-right font-mono text-stone-700"
                      >
                        {b && b.ntrp !== null ? b.ntrp.toFixed(1) : "—"}
                      </td>
                    );
                  })}
                  <td className="px-3 py-2 text-right font-mono font-medium text-court-700">
                    {pl.perf !== null ? pl.perf.toFixed(2) : "—"}
                  </td>
                  <td className="px-3 py-2 text-xs text-stone-500">
                    {ratingTypeLabel(latestType)}
                  </td>
                </tr>
              );
            })}
            {data.rows.length === 0 && (
              <tr>
                <td
                  colSpan={4 + years.length}
                  className="px-3 py-8 text-center text-stone-400"
                >
                  No players match the filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BandChip({
  current,
  value,
  q,
  sort,
  label,
}: {
  current: string;
  value: string;
  q: string;
  sort: string;
  label: string;
}) {
  const active = current === value;
  const query: Record<string, string> = {};
  if (q) query.q = q;
  if (sort) query.sort = sort;
  if (value) query.band = value;
  return (
    <Link
      href={{ pathname: "/players", query }}
      className={`rounded px-2 py-0.5 text-xs ${
        active
          ? "bg-court-700 text-white"
          : "bg-white text-stone-700 border border-stone-300 hover:bg-stone-100"
      }`}
    >
      {label}
    </Link>
  );
}
