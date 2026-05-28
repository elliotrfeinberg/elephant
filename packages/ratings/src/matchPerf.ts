// Per-match "performance rating" model — closer to USTA's published
// NTRP dynamic-rating approach than Glicko.
//
// For each completed match, the player's *performance rating* for that
// match is a function of (opponent's pre-match rating, game differential
// in this match). The player's *current rating* is then a weighted mean
// of their recent performance ratings.
//
// Key advantages over Glicko for this use case:
//
// 1. Output is on the NTRP scale by construction — no separate
//    calibration pass needed. Roster levels (3.0, 3.5, 4.0, ...) IS the
//    rating space.
// 2. Score margin matters. A 6-0, 6-0 sweep contributes a stronger
//    signal than a 7-6, 7-6 nailbiter.
// 3. Each match anchors against the opponent's actual rating, not a
//    shared 1500 prior — so disjoint clusters (e.g. a 3.0 subflight
//    and a 4.0 subflight that share no players) don't drift toward
//    each other's anchor.
//
// Calibration anchor (per project-owner spec): a 6-0, 6-0 result
// indicates at least a 0.5 NTRP level gap between the players. So the
// max single-match performance delta vs. opponent is 0.5 NTRP, hit at
// game-ratio = 1.0.

export interface MatchPerfConfig {
  // Maximum performance-rating adjustment from a totally lopsided
  // result. A 6-0, 6-0 win = ratio 1.0 → +maxDelta. Loss is symmetric.
  // 0.5 reflects USTA's general rule that a double-bagel implies a
  // ≥0.5-level difference.
  maxDelta: number;
}

export const DEFAULT_MATCH_PERF_CONFIG: MatchPerfConfig = {
  maxDelta: 0.5,
};

// Compute a player's performance rating for a single match, in NTRP
// units. Inputs are summed across all sets played:
//   opponentRating - opponent's pre-match rating (NTRP scale)
//   gamesWon       - games won by this player's side
//   gamesLost      - games won by the opponent's side
//
// Linear approximation:
//   perf = opp + maxDelta * (gamesWon - gamesLost) / (gamesWon + gamesLost)
//
// At ratio = +1.0 (6-0, 6-0 win):   perf = opp + maxDelta
// At ratio =  0.0 (tied games):     perf = opp
// At ratio = -1.0 (0-6, 0-6 loss):  perf = opp - maxDelta
//
// A 7-6, 7-6 win is essentially a coin flip in this model (ratio ≈ 0.04
// → perf ≈ opp + 0.02), which matches intuition: tiebreak matches
// indicate the players are at equivalent level.
//
// Retired or default matches: the partial score reflects what was
// played; we still compute a perf rating from it. Callers can opt to
// down-weight or skip these.
export function matchPerformance(
  opponentRating: number,
  gamesWon: number,
  gamesLost: number,
  cfg: MatchPerfConfig = DEFAULT_MATCH_PERF_CONFIG
): number {
  const total = gamesWon + gamesLost;
  if (total <= 0) return opponentRating;
  const ratio = (gamesWon - gamesLost) / total;
  return opponentRating + cfg.maxDelta * ratio;
}
