// Live player-search endpoint for the autocomplete. Returns up to 8 players
// matching the query, ranked by perf rating.
import { NextResponse } from "next/server";
import { listPlayers } from "@/lib/players";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim();
  if (!q) return NextResponse.json({ results: [], total: 0 });
  const data = await listPlayers({ q, sort: "perf", limit: 8 });
  const results = data.rows.map((r) => ({
    id: r.id,
    name: r.name,
    gender: r.gender,
    perf: r.perf,
    band: r.latestNtrp,
  }));
  return NextResponse.json({ results, total: data.total });
}
