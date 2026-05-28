// Parse the rendered HTML of the team-search results page.
//
// Each result row is a team with:
// - team name (anchor text)
// - par1 token (from the anchor's href, e.g. ?t=3&par1=…)
// - section / district / league / flight (sibling table cells)
//
// USTA renders results in <table id="...gvSearchResults..."> or similar;
// we don't depend on the exact id — we scan every anchor whose href
// includes par1= and look up its row context.

import * as cheerio from "cheerio";

export interface TeamSearchRow {
  // Team name as it appears in the anchor.
  teamName: string;
  // par1 token when the row uses a direct href (rare on the criteria
  // search — most rows use postback navigation, in which case par1 is
  // undefined and `eventTarget` carries the ASP.NET event target).
  par1: string | undefined;
  // ASP.NET __doPostBack event target id for this row's team link.
  // Pass this to BrowserFetcher.clickPostback to navigate to the
  // team and harvest its par1 from the destination URL.
  eventTarget: string | undefined;
  // Row context columns. Order observed: Team | Section | District
  // | League | Flight. Empty when the row had no surrounding table.
  section: string;
  district: string;
  league: string;
  flight: string;
}

export interface ParsedTeamSearch {
  // Best-effort header context (year/section/etc.) parsed from the
  // page header. Undefined if not present.
  context: string | undefined;
  rows: TeamSearchRow[];
}

export function parseTeamSearch(html: string): ParsedTeamSearch {
  const $ = cheerio.load(html);

  // Header context: USTA sometimes echoes the search criteria above
  // the results. We look for the most-specific breadcrumb-like text.
  let context: string | undefined;
  $("h1, h2, h3, .pageHeading, .searchCriteria").each((_, el) => {
    const t = $(el).text().trim().replace(/\s+/g, " ");
    if (
      t &&
      t.length < 200 &&
      (t.includes("Result") || t.includes("Team") || t.includes("Search"))
    ) {
      if (!context) context = t;
    }
  });

  const rows: TeamSearchRow[] = [];
  const seenKey = new Set<string>();

  // Two anchor forms are accepted:
  // - href contains "par1=" → direct link (rare on this search)
  // - href contains "__doPostBack" → ASP.NET postback (common; the
  //   team's par1 is only revealed by following the postback)
  $("a").each((_, a) => {
    const $a = $(a);
    const href = $a.attr("href") ?? "";
    const teamName = $a.text().trim().replace(/\s+/g, " ");
    if (!teamName) return;

    let par1: string | undefined;
    let eventTarget: string | undefined;

    const parMatch = href.match(/[?&]par1=([^&]+)/);
    if (parMatch) {
      const tMatch = href.match(/[?&]t=([^&]+)/);
      if (tMatch && tMatch[1] !== "3") return; // not a team-profile link
      const decoded = decodeURIComponent(parMatch[1]!);
      if (!/^[0-9A-Fa-f]{20,}$/.test(decoded)) return;
      par1 = decoded;
    } else {
      const pbMatch = href.match(/__doPostBack\(['"]([^'"]+)['"]/);
      if (!pbMatch) return;
      eventTarget = pbMatch[1]!;
      // Most postback anchors on the page are non-team chrome (paging,
      // sorting, etc.). The team-row postbacks live under a repeater
      // named rptYearTeamsInfo — gate on that id fragment.
      if (!/rptYearTeamsInfo/.test(eventTarget)) return;
    }

    // Dedup on (eventTarget || par1) — each team's postback target is
    // unique, and any duplicate par1 should be skipped too.
    const dedupKey = eventTarget ?? par1!;
    if (seenKey.has(dedupKey)) return;
    seenKey.add(dedupKey);

    // Harvest the row's other cells as section/district/league/flight.
    const $tr = $a.closest("tr");
    const cellTexts: string[] = [];
    $tr.find("td").each((_, td) => {
      const cellText = $(td).text().trim().replace(/\s+/g, " ");
      if (cellText && cellText !== teamName) cellTexts.push(cellText);
    });

    rows.push({
      teamName,
      par1,
      eventTarget,
      section: cellTexts[0] ?? "",
      district: cellTexts[1] ?? "",
      league: cellTexts[2] ?? "",
      flight: cellTexts[3] ?? "",
    });
  });

  return { context, rows };
}
