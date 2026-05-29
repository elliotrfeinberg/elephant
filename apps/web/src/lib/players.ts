// Server-side player data, backed by Postgres (replaces the perf-ratings
// JSON loader). Phase-1 ingestion populates `players` + `player_year_ratings`
// (published NTRP band + rating type + par1 per year). Computed perf ratings
// and match history are NOT in the DB yet (phase-2 backfill + ratings
// persistence), so those surfaces show a "pending" state for now.

import "server-only";
import { createClient, players, playerYearRatings } from "@tennis/db";
import { and, asc, eq, ilike, inArray, sql } from "drizzle-orm";

const SECTION = "USTA/NO. CALIFORNIA";
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Singleton client — Next keeps modules warm across requests in a server
// process, so we reuse one connection pool rather than opening per request.
let _db: ReturnType<typeof createClient> | undefined;
function db() {
  if (!_db) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    _db = createClient(url);
  }
  return _db;
}

export interface PlayerYearBand {
  year: number;
  ntrp: number | null;
  ratingType: string | null;
  ratingDate: Date | null;
}

export interface PlayerRow {
  id: string;
  name: string;
  gender: string | null;
  memberId: string | null;
  latestNtrp: number | null;
  bands: PlayerYearBand[]; // ascending by year
}

export interface PlayerListResult {
  rows: PlayerRow[];
  total: number;
  shown: number;
  bandCounts: { band: number; count: number }[];
}

export async function listPlayers(opts: {
  q?: string;
  band?: string;
  sort?: "name" | "band";
  limit?: number;
}): Promise<PlayerListResult> {
  const d = db();
  const limit = opts.limit ?? 200;
  const q = (opts.q ?? "").trim();

  const conds = [eq(players.sectionCode, SECTION)];
  if (q) conds.push(ilike(players.displayName, `%${q}%`));
  if (opts.band) conds.push(eq(players.publishedNtrp, Number(opts.band)));
  const where = and(...conds);

  const totalRes = await d
    .select({ total: sql<number>`count(*)::int` })
    .from(players)
    .where(where);
  const total = totalRes[0]?.total ?? 0;

  const order =
    opts.sort === "band"
      ? [sql`${players.publishedNtrp} desc nulls last`, asc(players.displayName)]
      : [asc(players.displayName)];
  const ps = await d
    .select({
      id: players.id,
      name: players.displayName,
      gender: players.gender,
      memberId: players.ustaMemberId,
      latestNtrp: players.publishedNtrp,
    })
    .from(players)
    .where(where)
    .orderBy(...order)
    .limit(limit);

  const ids = ps.map((p) => p.id);
  const yearRows = ids.length
    ? await d
        .select({
          playerId: playerYearRatings.playerId,
          year: playerYearRatings.year,
          ntrp: playerYearRatings.ntrp,
          ratingType: playerYearRatings.ratingType,
          ratingDate: playerYearRatings.ratingDate,
        })
        .from(playerYearRatings)
        .where(inArray(playerYearRatings.playerId, ids))
    : [];
  const bandsByPlayer = new Map<string, PlayerYearBand[]>();
  for (const r of yearRows) {
    const arr = bandsByPlayer.get(r.playerId) ?? [];
    arr.push({
      year: r.year,
      ntrp: r.ntrp,
      ratingType: r.ratingType,
      ratingDate: r.ratingDate,
    });
    bandsByPlayer.set(r.playerId, arr);
  }
  const rows: PlayerRow[] = ps.map((p) => ({
    ...p,
    bands: (bandsByPlayer.get(p.id) ?? []).sort((a, b) => a.year - b.year),
  }));

  const bc = await d
    .select({
      band: players.publishedNtrp,
      count: sql<number>`count(*)::int`,
    })
    .from(players)
    .where(eq(players.sectionCode, SECTION))
    .groupBy(players.publishedNtrp);
  const bandCounts = bc
    .filter((b) => b.band !== null)
    .map((b) => ({ band: b.band as number, count: b.count }))
    .sort((a, b) => a.band - b.band);

  return { rows, total, shown: rows.length, bandCounts };
}

export async function findPlayer(id: string): Promise<PlayerRow | null> {
  if (!UUID_RE.test(id)) return null;
  const d = db();
  const [p] = await d
    .select({
      id: players.id,
      name: players.displayName,
      gender: players.gender,
      memberId: players.ustaMemberId,
      latestNtrp: players.publishedNtrp,
    })
    .from(players)
    .where(eq(players.id, id))
    .limit(1);
  if (!p) return null;
  const yearRows = await d
    .select({
      year: playerYearRatings.year,
      ntrp: playerYearRatings.ntrp,
      ratingType: playerYearRatings.ratingType,
      ratingDate: playerYearRatings.ratingDate,
    })
    .from(playerYearRatings)
    .where(eq(playerYearRatings.playerId, id))
    .orderBy(asc(playerYearRatings.year));
  return { ...p, bands: yearRows };
}

const RATING_TYPE_LABEL: Record<string, string> = {
  C: "Computer",
  S: "Self-rated",
  A: "Appeal",
  M: "Mixed",
  T: "Tournament",
  D: "Dynamic",
};
export function ratingTypeLabel(t: string | null | undefined): string {
  if (!t) return "—";
  return RATING_TYPE_LABEL[t] ?? t;
}
