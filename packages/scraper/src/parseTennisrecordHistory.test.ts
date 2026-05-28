import { describe, expect, it } from "vitest";
import {
  parseScoreString,
  parseTennisrecordHistory,
} from "./parseTennisrecordHistory.js";

describe("parseScoreString", () => {
  it("parses a simple 2-set sweep", () => {
    expect(parseScoreString("6-36-1")).toEqual([
      { playerGames: 6, opponentGames: 3 },
      { playerGames: 6, opponentGames: 1 },
    ]);
  });

  it("parses 6-0, 6-0 (double bagel)", () => {
    expect(parseScoreString("6-06-0")).toEqual([
      { playerGames: 6, opponentGames: 0 },
      { playerGames: 6, opponentGames: 0 },
    ]);
  });

  it("parses 7-6, 7-6 (two tiebreak sets)", () => {
    expect(parseScoreString("7-67-6")).toEqual([
      { playerGames: 7, opponentGames: 6 },
      { playerGames: 7, opponentGames: 6 },
    ]);
  });

  it("parses a 3-set match with a super-tiebreak shown as 1-0", () => {
    expect(parseScoreString("4-66-41-0")).toEqual([
      { playerGames: 4, opponentGames: 6 },
      { playerGames: 6, opponentGames: 4 },
      { playerGames: 1, opponentGames: 0 },
    ]);
  });

  it("parses a 10-X match tiebreak (two-digit winner)", () => {
    // 6-4, 4-6, 10-7
    expect(parseScoreString("6-44-610-7")).toEqual([
      { playerGames: 6, opponentGames: 4 },
      { playerGames: 4, opponentGames: 6 },
      { playerGames: 10, opponentGames: 7 },
    ]);
  });

  it("returns empty array for an empty / unparseable string", () => {
    expect(parseScoreString("")).toEqual([]);
    expect(parseScoreString("retired")).toEqual([]);
  });
});

describe("parseTennisrecordHistory header parsing", () => {
  it("extracts player name + location + published level from the header table", () => {
    const html = `<html><body>
      <table><tr>
        <td>Stella So (Walnut Creek, CA) Female</td>
        <td>3.5 C12/31/2025</td>
      </tr></table>
    </body></html>`;
    const result = parseTennisrecordHistory(html);
    expect(result.playerName).toBe("Stella So");
    expect(result.playerLocation).toBe("Walnut Creek, CA");
    expect(result.publishedLevel).toBe(3.5);
    expect(result.rows).toHaveLength(0);
  });
});
