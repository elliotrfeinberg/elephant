// Chronological Glicko-2 pass over a subflight's match history.
//
// Model decision (per the architecture choice on file): for doubles
// courts, we treat each side as having a single combined rating (mean
// of its players) for the purpose of the opponent in the update step,
// and we attribute the win/loss equally to each player on the winning/
// losing side. This is the simplest reasonable model for league play
// and matches how most rec-tennis ranking systems handle doubles.
//
// Per-match updates (not per-rating-period) — Glickman notes this is
// equivalent up to small reordering effects when match volume per
// player is low (true for league play: ~15 matches per player per
// season).
//
// Courts with an undefined winner (no mark.gif on either side, rare)
// are skipped. Retired/defaulted courts are handled by the underlying
// scorecard parser, which already reflects them in `homeWon`.

import {
  DEFAULT_CONFIG,
  newRating,
  updateRating,
  type Glicko2Config,
  type Rating,
} from "@tennis/ratings";
import type { CapturesData, CourtMatch } from "./loadCaptures.js";

export interface ComputeRatingsResult {
  ratings: Map<string, Rating>;
  // How many matches contributed to each player's rating — useful for
  // weighting downstream fits (low-match-count players are noisier).
  matchCounts: Map<string, number>;
  // Matches we skipped (no winner inferable). Returned so the caller
  // can surface coverage stats.
  skipped: number;
}

export interface ComputeRatingsOptions {
  config?: Partial<Glicko2Config>;
  // When provided, each labeled player's initial Glicko rating is set
  // from their NTRP band (band → glicko via this function) before the
  // chronological update runs. Unlabeled players still default to
  // newRating(cfg). Use this to break disjoint-cluster anchoring on
  // multi-subflight unions: without it, every cluster's ratings drift
  // around the same prior (1500) regardless of band — so the cross-
  // band regression has no slope.
  //
  // Reasonable default: ntrp => 1500 + (ntrp - 3.5) * 400 (i.e. 1.0
  // NTRP unit ≈ 400 Glicko points, anchored at 1500↔3.5).
  ntrpToGlickoPrior?: (ntrp: number) => number;
}

// Default prior: 1 NTRP unit ≈ 400 Glicko points, with 1500 anchoring
// at NTRP 3.5 (the most populous band in our captures). Picked to fall
// within Glickman's "good rating system" range — typical singles-player
// Glickos span 1200–2000 for amateur play.
export const DEFAULT_NTRP_TO_GLICKO_PRIOR = (ntrp: number): number =>
  1500 + (ntrp - 3.5) * 400;

export function computeRatings(
  captures: CapturesData,
  optsOrConfig: ComputeRatingsOptions | Partial<Glicko2Config> = {}
): ComputeRatingsResult {
  // Back-compat: callers used to pass a Glicko2Config directly. If we
  // see config-shaped keys treat the argument as the config; otherwise
  // it's the options object.
  const opts: ComputeRatingsOptions =
    "config" in optsOrConfig || "ntrpToGlickoPrior" in optsOrConfig
      ? (optsOrConfig as ComputeRatingsOptions)
      : { config: optsOrConfig as Partial<Glicko2Config> };
  const cfg = { ...DEFAULT_CONFIG, ...(opts.config ?? {}) };
  const prior = opts.ntrpToGlickoPrior;

  const ratings = new Map<string, Rating>();
  const counts = new Map<string, number>();
  let skipped = 0;

  // Seed labeled players with their NTRP-band prior when requested.
  // This fixes the disjoint-cluster problem on multi-subflight unions:
  // each band's cluster now starts anchored at a different rating, so
  // the post-fit predictions actually span the NTRP range.
  if (prior) {
    for (const p of captures.players.values()) {
      if (p.ntrp === undefined) continue;
      ratings.set(p.key, {
        rating: prior(p.ntrp),
        rd: cfg.defaultRd,
        vol: cfg.defaultVol,
      });
    }
  }

  const get = (key: string): Rating => ratings.get(key) ?? newRating(cfg);
  const bumpCount = (key: string) =>
    counts.set(key, (counts.get(key) ?? 0) + 1);

  for (const m of captures.matches) {
    if (m.homeWon === undefined) {
      skipped += 1;
      continue;
    }
    if (m.homePlayerKeys.length === 0 || m.visitorPlayerKeys.length === 0) {
      skipped += 1;
      continue;
    }

    // Capture pre-update ratings so doubles partners are both compared
    // against the same opponent-side mean. Otherwise the second player
    // would see an already-updated team mean.
    const homePre = m.homePlayerKeys.map(get);
    const visitorPre = m.visitorPlayerKeys.map(get);
    const homeMean = meanRating(homePre);
    const visitorMean = meanRating(visitorPre);

    for (let i = 0; i < m.homePlayerKeys.length; i++) {
      const key = m.homePlayerKeys[i]!;
      const updated = updateRating(
        homePre[i]!,
        [{ opponent: visitorMean, score: m.homeWon ? 1 : 0 }],
        cfg
      );
      ratings.set(key, updated);
      bumpCount(key);
    }
    for (let i = 0; i < m.visitorPlayerKeys.length; i++) {
      const key = m.visitorPlayerKeys[i]!;
      const updated = updateRating(
        visitorPre[i]!,
        [{ opponent: homeMean, score: m.homeWon ? 0 : 1 }],
        cfg
      );
      ratings.set(key, updated);
      bumpCount(key);
    }
  }

  return { ratings, matchCounts: counts, skipped };
}

// Mean rating + RD across N players on one side of a doubles (or
// singles) court. The averaged RD reflects how uncertain we are about
// the combined side, which is what Glicko's update step needs to know
// when scaling its adjustment.
function meanRating(ratings: Rating[]): Rating {
  if (ratings.length === 1) return ratings[0]!;
  let r = 0;
  let rd = 0;
  let vol = 0;
  for (const x of ratings) {
    r += x.rating;
    rd += x.rd;
    vol += x.vol;
  }
  const n = ratings.length;
  return { rating: r / n, rd: rd / n, vol: vol / n };
}

// Helper for the CLI / downstream: extract (glicko, ntrp) labels for
// the players we have NTRP labels for and that played enough matches
// to have a converged-ish rating. Returns rows in (key, name, rating,
// rd, ntrp, matches) form so callers can dump them or feed to
// fitCalibration.
export interface LabeledRatingRow {
  key: string;
  name: string;
  rating: number;
  rd: number;
  ntrp: number;
  matches: number;
  teams: string[];
}

export function labeledRows(
  captures: CapturesData,
  result: ComputeRatingsResult,
  opts: { minMatches?: number } = {}
): LabeledRatingRow[] {
  const minMatches = opts.minMatches ?? 3;
  const rows: LabeledRatingRow[] = [];
  for (const p of captures.players.values()) {
    if (p.ntrp === undefined) continue;
    const r = result.ratings.get(p.key);
    if (!r) continue;
    const matches = result.matchCounts.get(p.key) ?? 0;
    if (matches < minMatches) continue;
    rows.push({
      key: p.key,
      name: p.name,
      rating: r.rating,
      rd: r.rd,
      ntrp: p.ntrp,
      matches,
      teams: p.teams,
    });
  }
  return rows;
}
