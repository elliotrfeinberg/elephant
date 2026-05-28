import { describe, expect, it } from "vitest";
import { matchPerformance, DEFAULT_MATCH_PERF_CONFIG } from "./matchPerf.js";

describe("matchPerformance", () => {
  it("6-0, 6-0 win hits +0.5 ceiling vs opponent rating", () => {
    expect(matchPerformance(3.0, 12, 0)).toBeCloseTo(3.5, 6);
  });

  it("0-6, 0-6 loss hits -0.5 floor vs opponent rating", () => {
    expect(matchPerformance(4.0, 0, 12)).toBeCloseTo(3.5, 6);
  });

  it("equal games (e.g. 6-6, 6-6) returns opponent rating", () => {
    // Not a real tennis score, but mathematically the boundary case
    // — exercises the ratio-0 branch.
    expect(matchPerformance(3.5, 12, 12)).toBeCloseTo(3.5, 6);
  });

  it("7-6, 7-6 produces near-zero delta (essentially tied)", () => {
    // 13-12 games per set → 26 won, 24 lost → ratio ~0.04
    expect(matchPerformance(3.5, 14, 12)).toBeCloseTo(3.5 + 0.5 * (2 / 26), 6);
  });

  it("6-3, 6-3 win produces ~+0.21", () => {
    // 12 won, 6 lost, total 18, ratio 0.333
    expect(matchPerformance(3.0, 12, 6)).toBeCloseTo(3.0 + 0.5 * (6 / 18), 6);
  });

  it("symmetric: winner perf + loser perf = 2 * opponent rating", () => {
    // For any score, winner sees opp + Δ and loser sees opp - Δ relative
    // to *their* opponent. Since each is the other's opponent and ratings
    // are pre-match-equal-by-construction here, the perfs sum to twice
    // the (shared) opponent rating.
    const w = matchPerformance(3.5, 12, 4);
    const l = matchPerformance(3.5, 4, 12);
    expect(w + l).toBeCloseTo(7.0, 6);
  });

  it("zero-game match (defaulted before any play) returns opp rating", () => {
    expect(matchPerformance(3.5, 0, 0)).toBe(3.5);
  });

  it("respects custom maxDelta config", () => {
    expect(
      matchPerformance(3.0, 12, 0, { maxDelta: 1.0 })
    ).toBeCloseTo(4.0, 6);
  });

  it("default config has maxDelta=0.5", () => {
    expect(DEFAULT_MATCH_PERF_CONFIG.maxDelta).toBe(0.5);
  });
});
