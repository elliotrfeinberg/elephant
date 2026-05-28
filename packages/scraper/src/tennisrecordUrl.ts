// URL builders for tennisrecord.com. Public site — no auth required.

const BASE = "https://www.tennisrecord.com";

// Player profile (summary stats + team list). Accepts the player's full
// name as it appears on USTA rosters.
export function tennisrecordProfileUrl(playerName: string): string {
  const params = new URLSearchParams({ playername: playerName });
  return `${BASE}/adult/profile.aspx?${params}`;
}

// Match history for a specific year (or "Recent" / "Rating" for the
// current rating season).
export function tennisrecordHistoryUrl(
  playerName: string,
  year: number | "Recent" | "Rating"
): string {
  const params = new URLSearchParams({
    year: String(year),
    playername: playerName,
  });
  return `${BASE}/adult/matchhistory.aspx?${params}`;
}
