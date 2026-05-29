// Player detail — backed by Postgres. Phase-1 shows per-season published
// NTRP bands + rating type. Match log + rating sparkline return once match
// ingestion (phase-2) is wired.

import Link from "next/link";
import { notFound } from "next/navigation";
import { findPlayer, ratingTypeLabel } from "@/lib/players";

function fmtDate(d: Date | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US");
}

export default async function PlayerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const player = await findPlayer(id);
  if (!player) notFound();

  const bands = player.bands;
  const latest = bands.length > 0 ? bands[bands.length - 1]! : undefined;

  return (
    <div className="space-y-8">
      <div>
        <Link href="/players" className="text-xs text-stone-500 hover:underline">
          ← Back to players
        </Link>
        <h1 className="mt-1 text-2xl font-bold">{player.name}</h1>
        <p className="text-sm text-stone-600">
          {player.gender ?? "—"}
          {player.memberId && (
            <>
              {" · "}
              <span className="font-mono text-xs text-stone-400">
                USTA #{player.memberId}
              </span>
            </>
          )}
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <Stat
          label="Latest roster band"
          value={
            latest && latest.ntrp !== null ? latest.ntrp.toFixed(1) : "—"
          }
          sub={latest ? `${latest.year} · ${ratingTypeLabel(latest.ratingType)}` : ""}
        />
        <Stat label="Seasons rated" value={String(bands.length)} />
        <Stat
          label="Performance rating"
          value="—"
          sub="pending match ingestion"
        />
      </section>

      <section className="overflow-hidden rounded-lg border border-stone-200 bg-white">
        <h2 className="border-b border-stone-100 bg-stone-50 px-4 py-2 text-sm font-medium text-stone-700">
          Published NTRP by season
        </h2>
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-left text-xs uppercase tracking-wide text-stone-500">
            <tr>
              <th className="px-3 py-2">Season</th>
              <th className="px-3 py-2 text-right">NTRP band</th>
              <th className="px-3 py-2">Rating type</th>
              <th className="px-3 py-2">Rating date</th>
            </tr>
          </thead>
          <tbody>
            {bands.map((b) => (
              <tr key={b.year} className="border-t border-stone-100">
                <td className="px-3 py-2 font-medium">{b.year}</td>
                <td className="px-3 py-2 text-right font-mono">
                  {b.ntrp !== null ? b.ntrp.toFixed(1) : "—"}
                </td>
                <td className="px-3 py-2 text-xs text-stone-600">
                  {ratingTypeLabel(b.ratingType)}
                </td>
                <td className="px-3 py-2 font-mono text-xs text-stone-500">
                  {fmtDate(b.ratingDate)}
                </td>
              </tr>
            ))}
            {bands.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-8 text-center text-stone-400">
                  No published ratings on record.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="rounded-lg border border-dashed border-stone-300 bg-stone-50 p-6 text-center text-sm text-stone-500">
        Match history &amp; performance-rating trend will appear here once match
        ingestion (phase&nbsp;2) is complete.
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-4">
      <div className="text-xs uppercase tracking-wide text-stone-500">
        {label}
      </div>
      <div className="mt-1 text-3xl font-bold text-stone-900">{value}</div>
      {sub && <div className="text-xs text-stone-500">{sub}</div>}
    </div>
  );
}
