// Compute perf ratings over the matches stored in Postgres.
//
// Adapts the relational tables (players + player_year_ratings + court_matches
// via team_matches → teams → flight → league) into the calibrate CapturesData
// shape, then runs the existing per-category perf model (year carry-over +
// confidence weighting). This is a PREVIEW/compute step — it prints a
// per-band summary and does not persist results yet (persisting perf ratings
// needs the ratings-table redesign, which is intentionally deferred).

import {
  createClient,
  players,
  playerYearRatings,
  teamMatches,
  courtMatches,
  teams,
  subflights,
  flights,
  leagues,
} from "@tennis/db";
import { alias } from "drizzle-orm/pg-core";
import { eq } from "drizzle-orm";
import {
  computePerfRatings,
  ntrpBandMidpoint,
  type CapturesData,
  type CourtMatch,
  type PlayerLabel,
} from "@tennis/calibrate";

const SECTION = "USTA/NO. CALIFORNIA";

export async function computeRatingsFromDb(opts: {
  databaseUrl: string;
  minMatches: number;
}): Promise<void> {
  const db = createClient(opts.databaseUrl);

  // Players → PlayerLabel (with per-year bands + rating type).
  const playerMap = new Map<string, PlayerLabel>();
  for (const p of await db
    .select({
      id: players.id,
      name: players.displayName,
      memberId: players.ustaMemberId,
      ntrp: players.publishedNtrp,
    })
    .from(players)
    .where(eq(players.sectionCode, SECTION))) {
    playerMap.set(p.id, {
      key: p.id,
      name: p.name,
      memberId: p.memberId ?? undefined,
      ntrp: p.ntrp ?? undefined,
      ntrpByYear: new Map<number, number>(),
      ratingType: undefined,
      teams: [],
    });
  }
  for (const r of await db
    .select({
      playerId: playerYearRatings.playerId,
      year: playerYearRatings.year,
      ntrp: playerYearRatings.ntrp,
      ratingType: playerYearRatings.ratingType,
    })
    .from(playerYearRatings)) {
    const pl = playerMap.get(r.playerId);
    if (!pl) continue;
    if (r.ntrp != null) pl.ntrpByYear.set(r.year, r.ntrp);
    if (r.ratingType) pl.ratingType = r.ratingType;
  }

  // Team-match context (league name + year + both team names), home/visitor
  // teams aliased so we can name both sides in one query.
  const homeT = alias(teams, "home_t");
  const visT = alias(teams, "vis_t");
  const tmMap = new Map<
    string,
    {
      matchId: string;
      playedOn: Date | null;
      homeName: string;
      visitorName: string;
      leagueName: string;
      year: number;
    }
  >();
  for (const t of await db
    .select({
      id: teamMatches.id,
      matchId: teamMatches.ustaMatchId,
      playedOn: teamMatches.playedOn,
      homeName: homeT.name,
      visitorName: visT.name,
      leagueName: leagues.name,
      year: leagues.year,
    })
    .from(teamMatches)
    .innerJoin(homeT, eq(teamMatches.homeTeamId, homeT.id))
    .innerJoin(visT, eq(teamMatches.visitorTeamId, visT.id))
    .innerJoin(subflights, eq(homeT.subflightId, subflights.id))
    .innerJoin(flights, eq(subflights.flightId, flights.id))
    .innerJoin(leagues, eq(flights.leagueId, leagues.id))) {
    tmMap.set(t.id, {
      matchId: t.matchId ?? t.id,
      playedOn: t.playedOn,
      homeName: t.homeName,
      visitorName: t.visitorName,
      leagueName: t.leagueName,
      year: t.year,
    });
  }

  // Court matches → calibrate CourtMatch (one per court).
  const matches: CourtMatch[] = [];
  for (const c of await db
    .select({
      teamMatchId: courtMatches.teamMatchId,
      kind: courtMatches.courtKind,
      line: courtMatches.line,
      h1: courtMatches.homePlayer1Id,
      h2: courtMatches.homePlayer2Id,
      v1: courtMatches.visitorPlayer1Id,
      v2: courtMatches.visitorPlayer2Id,
      sets: courtMatches.sets,
      homeWon: courtMatches.homeWon,
    })
    .from(courtMatches)) {
    const tm = tmMap.get(c.teamMatchId);
    if (!tm) continue;
    const sets = (c.sets as Array<{ home: number; visitor: number }>) ?? [];
    let gh = 0;
    let gv = 0;
    for (const s of sets) {
      gh += s.home;
      gv += s.visitor;
    }
    matches.push({
      matchId: tm.matchId,
      date: tm.playedOn ?? new Date(tm.year, 0, 1),
      homeTeamName: tm.homeName,
      visitorTeamName: tm.visitorName,
      line: c.line,
      kind: c.kind,
      homePlayerKeys: [c.h1, c.h2].filter((x): x is string => !!x),
      visitorPlayerKeys: [c.v1, c.v2].filter((x): x is string => !!x),
      homeWon: c.homeWon,
      retired: undefined,
      defaulted: undefined,
      gamesHome: sets.length ? gh : undefined,
      gamesVisitor: sets.length ? gv : undefined,
      sets,
      league: tm.leagueName,
      seasonYear: tm.year,
    });
  }

  matches.sort((a, b) => a.date.getTime() - b.date.getTime());

  const captures: CapturesData = {
    year: matches[matches.length - 1]?.seasonYear ?? 0,
    ownTeamName: SECTION,
    ownTeamId: undefined,
    players: playerMap,
    matches,
    unresolvedNames: [],
    yearEndLabelMatches: 0,
    yearEndLabelOverrides: 0,
    yearEndUnmatched: 0,
  };

  console.error(
    `Loaded ${playerMap.size} players, ${matches.length} court matches from DB`
  );
  const result = computePerfRatings(captures);

  // Per-band summary: among players with >= minMatches rating-affecting
  // matches, the mean computed display rating vs the band's expected midpoint.
  const byBand = new Map<number, number[]>();
  let rated = 0;
  for (const [key, pr] of result.playerRatings) {
    const total = pr.adultMatches + pr.mixedMatches;
    if (total < opts.minMatches || pr.display === undefined) continue;
    rated += 1;
    const label = playerMap.get(key)?.ntrp;
    if (label === undefined) continue;
    const arr = byBand.get(label) ?? [];
    arr.push(pr.display);
    byBand.set(label, arr);
  }

  console.error(
    `\nPerf ratings for players with >= ${opts.minMatches} matches: ${rated}`
  );
  console.error("band  n   mean   (expected midpoint)");
  for (const band of [...byBand.keys()].sort((a, b) => a - b)) {
    const xs = byBand.get(band)!;
    const mean = xs.reduce((s, x) => s + x, 0) / xs.length;
    console.error(
      `${band.toFixed(1)}  ${String(xs.length).padStart(3)}  ${mean.toFixed(
        2
      )}   (${ntrpBandMidpoint(band).toFixed(2)})`
    );
  }
  if (result.skipped) console.error(`(skipped ${result.skipped} matches)`);

  await (
    db as unknown as { $client: { end: () => Promise<void> } }
  ).$client.end();
}
