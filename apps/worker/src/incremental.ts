// Daily incremental crawl. Cheap by design: it does NOT re-discover the match
// universe — flight enumeration already captured every scheduled match's date
// in flight_matches. A daily run only:
//
//   [1] (optional, weekly) re-scan ACTIVE flights' Match Summaries to pick up
//       newly scheduled / rescheduled matches → --refresh-flights.
//   [2] fetch scorecards for matches whose date has passed and that we haven't
//       pulled yet (dueOnly), skipping not-yet-played ones for a later retry.
//   [3] normalize the new scorecards into the relational schema.
//   [4] recompute perf ratings (full recompute — ratings are chronological /
//       path-dependent, so a clean rebuild is the correct, simple choice).
//
// Most days step 2 is just the matches played in the last 24h (minutes). Step 1
// is the only browser-driven part; run it on a slower cadence (e.g. weekly).

import { backfillScorecardsFromDb } from "./backfillScorecards.js";
import { backfillFlightMatches } from "./enumerateFlights.js";
import { normalizeMatches } from "./normalizeMatches.js";
import { computeRatingsFromDb } from "./computeRatingsDb.js";

export async function runIncremental(opts: {
  databaseUrl: string;
  year?: number; // restrict to a season (recommended: the active year)
  refreshFlights: boolean; // re-scan active flights first (weekly cadence)
  minMatches: number;
  minDelayMs: number;
  maxDelayMs: number;
}): Promise<void> {
  const { databaseUrl, year, minDelayMs, maxDelayMs } = opts;
  const years = year ? [year] : undefined;

  if (opts.refreshFlights) {
    console.error("\n=== [1/4] refresh active flight match lists ===");
    await backfillFlightMatches({
      databaseUrl,
      limit: Number.POSITIVE_INFINITY,
      refresh: true,
      years,
      minDelayMs,
      maxDelayMs,
    });
  } else {
    console.error(
      "\n=== [1/4] skip flight refresh (pass --refresh-flights for the weekly re-scan) ==="
    );
  }

  console.error("\n=== [2/4] fetch due, unfetched scorecards ===");
  await backfillScorecardsFromDb({
    databaseUrl,
    limit: Number.POSITIVE_INFINITY,
    year,
    dueOnly: true,
    minDelayMs,
    maxDelayMs,
  });

  console.error("\n=== [3/4] normalize new scorecards ===");
  await normalizeMatches({ databaseUrl, limit: Number.POSITIVE_INFINITY });

  console.error("\n=== [4/4] recompute perf ratings (persist) ===");
  await computeRatingsFromDb({
    databaseUrl,
    minMatches: opts.minMatches,
    persist: true,
  });

  console.error("\n=== incremental run complete ===");
}
