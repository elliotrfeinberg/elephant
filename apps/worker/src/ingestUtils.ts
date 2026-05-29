// Pure helpers shared across the DB ingestion commands (load-players,
// backfill-scorecards, normalize-matches). Kept side-effect-free so they
// can be unit-tested without a database.

export type Gender = "M" | "F" | "X";

// USTA rating-search names are "Last, First" (the last name may itself be
// multi-word). Convert to display "First Last". Comma-less input passes
// through with whitespace collapsed.
export function firstLast(name: string): string {
  const m = name.match(/^([^,]+),\s*(.+)$/);
  if (!m) return name.replace(/\s+/g, " ").trim();
  return `${m[2]!.trim()} ${m[1]!.trim()}`.replace(/\s+/g, " ").trim();
}

// Map a USTA gender code to our enum. Anything other than M/F is "X"
// (mixed / unknown).
export function mapGender(g: string | undefined): Gender {
  return g === "M" ? "M" : g === "F" ? "F" : "X";
}

// Parse a US "M/D/YYYY" date to a local Date. Returns null when the string
// is missing or doesn't lead with that pattern.
export function parseUsDate(s: string | undefined): Date | null {
  if (!s) return null;
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!m) return null;
  return new Date(Number(m[3]), Number(m[1]) - 1, Number(m[2]));
}

export function genderWord(g: Gender): string {
  return g === "F" ? "Women's" : g === "M" ? "Men's" : "Mixed";
}

// Parse the flight code embedded in a USTA team name, e.g.
// "MORAGA CC 40AW3.5A" -> { division: 40, gender: "F", ntrp: 3.5 }.
// Format: <2-digit division><category A|X><gender W|M|X><NTRP><team letter?>.
// A category of "X" (mixed) forces gender "X". Returns null when the suffix
// doesn't match (e.g. combo/tri-level team names).
export function parseTeamCode(
  name: string
): { division: number; gender: Gender; ntrp: number } | null {
  const m = name.match(/(\d{2})([AX])([WMX])(\d\.\d)[A-Z]?\s*$/i);
  if (!m) return null;
  const cat = m[2]!.toUpperCase();
  const gCode = m[3]!.toUpperCase();
  let gender: Gender = gCode === "W" ? "F" : gCode === "M" ? "M" : "X";
  if (cat === "X") gender = "X";
  return { division: Number(m[1]), gender, ntrp: Number(m[4]) };
}
