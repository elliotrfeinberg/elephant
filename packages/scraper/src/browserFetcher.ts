// Headless-Chromium fetcher for USTA pages that require real JS execution.
//
// PoliteFetcher (undici-based) handles plain GETs and POSTs fine, but
// USTA's __doPostBack links inside ASP.NET UpdatePanels invoke a JS
// `CSRFInitRequestHandler` that rewrites the __EVENTVALIDATION token at
// send time. A static replay of the form body bounces back to a default
// page. We need a real browser context to let that JS run.
//
// Design:
//
// - Same `CrawlFetcher` interface as PoliteFetcher — anything that takes
//   a fetcher can take either. The shared parser pipeline doesn't care
//   how HTML was sourced.
// - Cookies are imported from the existing UstaSession (the same one
//   PoliteFetcher uses). The user's logged-in session is the single
//   source of truth for auth; we don't re-implement login.
// - One browser process, one context, many pages. The context owns the
//   cookie jar. We close pages eagerly to avoid leaks but keep the
//   context (and its cookies) alive for the life of the fetcher.
// - Politeness: same host-queue + min-delay pattern as PoliteFetcher.
//   USTA doesn't care whether the requests came from undici or
//   Chromium — the rate limits apply equally.
//
// The browser is opened lazily on first use. Callers should `await
// fetcher.close()` when done to release the Chromium process.

import { setTimeout as sleep } from "node:timers/promises";
import type { Browser, BrowserContext, Page } from "playwright";
import type { CrawlFetcher } from "./crawlTeam.js";
import type { UstaSession } from "./session.js";

export interface BrowserFetcherOptions {
  session: UstaSession;
  minDelayMs?: number;
  maxDelayMs?: number;
  // If true (default), launch Chromium in headless mode. Pass false when
  // debugging — useful to watch what USTA's JS actually does.
  headless?: boolean;
}

export interface BrowserFetchResult {
  status: number;
  body: string | null;
  // The URL after any client-side or server-side redirects. For postback
  // navigations this is the key signal — opponent par1s show up here.
  finalUrl: string;
}

interface Queue {
  promise: Promise<unknown>;
  lastFinishedAt: number;
}

export class BrowserFetcher implements CrawlFetcher {
  private readonly session: UstaSession;
  private readonly minDelayMs: number;
  private readonly maxDelayMs: number;
  private readonly headless: boolean;
  private readonly hostQueues = new Map<string, Queue>();

  // Lazy-initialized on first request.
  private browser: Browser | undefined;
  private context: BrowserContext | undefined;

  constructor(opts: BrowserFetcherOptions) {
    this.session = opts.session;
    this.minDelayMs = opts.minDelayMs ?? 3000;
    this.maxDelayMs = opts.maxDelayMs ?? 5000;
    this.headless = opts.headless ?? true;
  }

  // Implements CrawlFetcher: a simple GET via the browser. We use this
  // when something farther down the pipeline (a postback) requires the
  // same logged-in browser context as a prior GET — otherwise plain
  // PoliteFetcher is cheaper and should be preferred.
  async fetch(url: string): Promise<BrowserFetchResult> {
    return this.runOnHost(new URL(url).host, async () => {
      const page = await this.openPage();
      try {
        const resp = await page.goto(url, { waitUntil: "domcontentloaded" });
        const finalUrl = page.url();
        const body = await page.content();
        return {
          status: resp?.status() ?? 0,
          body,
          finalUrl,
        };
      } finally {
        await page.close();
      }
    });
  }

  // Navigate to `url`, then dispatch a real click on the anchor that
  // corresponds to `eventTarget`. USTA's CSRFInitRequestHandler runs as
  // the page's own JS would; the href="javascript:__doPostBack(...)" is
  // evaluated by Chromium's javascript-URL handler in a non-strict
  // context, so ASP.NET's MS Ajax (which uses arguments.callee.caller)
  // doesn't choke the way it does when we call __doPostBack from a
  // page.evaluate strict-mode frame.
  //
  // eventTarget format: "ctl00$mainContent$rptTeamStandings$ctl06$LinkButton12".
  // The corresponding anchor has id "ctl00_mainContent_..._LinkButton12"
  // ($→_). We accept either form.
  //
  // If the postback does a partial UpdatePanel render (no navigation),
  // finalUrl equals the original url; body still reflects the updated
  // DOM. Caller decides whether that's a failure for their use case.
  async clickPostback(
    url: string,
    eventTarget: string
  ): Promise<BrowserFetchResult> {
    const anchorId = eventTarget.replace(/\$/g, "_");
    return this.runOnHost(new URL(url).host, async () => {
      const page = await this.openPage();
      try {
        const resp = await page.goto(url, { waitUntil: "domcontentloaded" });
        const startedAt = page.url();
        // Race a navigation against a settle timeout — postbacks that
        // navigate fire 'load'; ones that don't (UpdatePanel partial)
        // never do, and we resolve via the timeout.
        const navPromise = page
          .waitForURL((u) => u.toString() !== startedAt, {
            waitUntil: "domcontentloaded",
            timeout: 15000,
          })
          .catch(() => undefined);
        // Wait briefly for the anchor to exist; some ASP.NET pages
        // hydrate the standings table after DOMContentLoaded.
        await page.waitForSelector(`#${cssEscape(anchorId)}`, {
          timeout: 10000,
        });
        await page.click(`#${cssEscape(anchorId)}`);
        await navPromise;
        const finalUrl = page.url();
        const body = await page.content();
        return {
          status: resp?.status() ?? 0,
          body,
          finalUrl,
        };
      } finally {
        await page.close();
      }
    });
  }

  // Submit the "Stats and Standings Advanced Search" team form and
  // return the rendered results page. This is the entry point for
  // enumerating *every* team in a (year, section, division, gender,
  // optional level) tuple — far more efficient than starting from one
  // team par1 and walking standings.
  //
  // The form uses cascading UpdatePanel postbacks: selecting a section
  // triggers an async refresh that populates downstream dropdowns. We
  // page.selectOption between each field and wait for network-idle
  // after section/division to let the cascade settle.
  //
  // Field values are matched by VISIBLE LABEL (not the raw <option>
  // value attribute), because the section dropdown's value is a
  // composite like "6421379,515" that has caused selectOption-by-value
  // to silently no-op. Labels are stable across years.
  //
  //   year:     "2026" (literal year)
  //   section:  e.g. "USTA/NO. CALIFORNIA"
  //   division: e.g. "Adult 18&Over"
  //   gender:   "Male" | "Female" | "Mixed"
  //   level:    e.g. "3.5" | undefined = all levels in division
  async submitTeamSearch(criteria: {
    year: number;
    section: string; // e.g. "USTA/NO. CALIFORNIA"
    division: string; // e.g. "Adult 18&Over"
    gender: "Male" | "Female" | "Mixed";
    level?: string; // omit for all levels in division
    // After the search renders, click the first team row matching this
    // substring (case-insensitive) and harvest the destination URL's
    // par1. The returned result's `extractedPar1` carries the value;
    // `finalUrl` reflects the team-profile page reached.
    extractPar1ForTeamSubstring?: string;
  }): Promise<BrowserFetchResult & { extractedPar1?: string; extractedTeamName?: string }> {
    const url =
      "https://tennislink.usta.com/Leagues/Main/StatsAndStandings.aspx?SearchType=3";
    return this.runOnHost(new URL(url).host, async () => {
      const page = await this.openPage();
      try {
        const resp = await page.goto(url, { waitUntil: "domcontentloaded" });
        // The search controls live inside a jQuery-UI accordion that's
        // collapsed by default. Click the teams header and wait for the
        // slide-down to finish (the panel uses jQuery .slideDown so the
        // selects are visible-but-mid-animation immediately after click).
        await page
          .locator('#accordion h3:has-text("SEARCH FOR TEAMS")')
          .click({ timeout: 10000 });
        await page.waitForTimeout(400);
        // Set all dropdowns via DOM in one synchronous frame and fire
        // change events explicitly. Playwright's selectOption uses
        // input-actionability checks that, on this accordion form,
        // appear to drop the section's value before the server-side
        // ViewState observes it. Direct DOM set + change-event dispatch
        // matches what a real user click triggers.
        // Evaluate a stringified function to bypass tsx/esbuild's
        // `__name()` helper injection (`--keepNames`), which breaks
        // when the function is shipped into the browser context.
        // Embed criteria as JSON literals because page.evaluate(string)
        // doesn't take args (and using a function form trips tsx's
        // __name keepNames helper). The IIFE shape ensures the script
        // is an expression that returns immediately.
        const criteriaJson = JSON.stringify({
          year: String(criteria.year),
          section: criteria.section,
          division: criteria.division,
          gender: criteria.gender,
          level: criteria.level ?? null,
        });
        // ddlSection has onchange="setTimeout(__doPostBack('ddlSection',''),0)"
        // — selecting it triggers a full ASP.NET page postback that
        // races and discards our subsequent selections. We set values
        // by writing the property only (NO change event). The values
        // still get included in the form POST when submit fires; the
        // server's ViewState rehydrates them like any other field.
        const script = `(() => {
          const c = ${criteriaJson};
          const ids = [
            ["ctl00_mainContent_ddlChampYear", c.year],
            ["ctl00_mainContent_ddlSection", c.section],
            ["ctl00_mainContent_ddlDivisionForTeams", c.division],
            ["ctl00_mainContent_ddlGender", c.gender],
          ];
          if (c.level) ids.push(["ctl00_mainContent_ddlNTRPLevel", c.level]);
          for (const [id, label] of ids) {
            const el = document.getElementById(id);
            if (!el) return { ok: false, missingId: id, reason: "no element" };
            let matched = false;
            for (const opt of Array.from(el.options)) {
              if (opt.text.trim() === label) {
                el.value = opt.value;
                // Mark the matching option's selected attribute too so
                // the value survives any DOM reflow before submit. Skip
                // dispatchEvent('change'): on ddlSection that would
                // fire AutoPostBack and reset our other selections.
                for (const o of Array.from(el.options)) o.selected = false;
                opt.selected = true;
                matched = true;
                break;
              }
            }
            if (!matched) {
              return {
                ok: false,
                missingId: id,
                wanted: label,
                got: Array.from(el.options).map((o) => o.text.trim()).slice(0, 10),
              };
            }
          }
          return { ok: true };
        })()`;
        const result = (await page.evaluate(script)) as {
          ok: boolean;
          missingId?: string;
          wanted?: string;
          got?: string[];
          reason?: string;
        };
        if (!result.ok) {
          throw new Error(
            `submitTeamSearch: dropdown set failed on ${result.missingId} wanted="${
              result.wanted
            }" reason="${result.reason ?? ""}" sample=${JSON.stringify(
              result.got
            )}`
          );
        }
        // No wait needed: we skipped the change event, so no
        // AutoPostBack fires; the values sit in the DOM until submit.
        // Click "Find Teams". Despite the name btnSearchTeamByName, it
        // also accepts the criteria dropdowns — submitting with an
        // empty txtTeamName runs a pure criteria search. The other
        // team-section buttons (btnFindStatsAndStandingForTeam,
        // btnClearInputsForTeams) don't drive the criteria search.
        const beforeClick = await page.content();
        await page.click("#ctl00_mainContent_btnSearchTeamByName");
        // The form submit navigates (full reload, not UpdatePanel).
        // Wait for the page to settle and the results table to appear.
        await page
          .waitForLoadState("domcontentloaded", { timeout: 30000 })
          .catch(() => undefined);
        await page
          .waitForLoadState("networkidle", { timeout: 30000 })
          .catch(() => undefined);
        // Look for a results-grid id or fallback to any par1 anchor.
        // Whichever resolves first wins.
        await Promise.race([
          page
            .waitForSelector("table[id*='gvSearchResults'], a[href*='par1=']", {
              timeout: 30000,
            })
            .catch(() => undefined),
          page.waitForTimeout(15000),
        ]);
        const finalUrl = page.url();
        const body = await page.content();
        // Sanity guard: if the body didn't change, the submit didn't go
        // through (USTA sometimes silently rejects malformed criteria).
        if (body === beforeClick) {
          throw new Error(
            "submitTeamSearch: body unchanged after submit — criteria may be invalid"
          );
        }

        // Optional second hop: click a team-row postback to harvest its
        // par1. The results page links each team via __doPostBack; the
        // destination is the team-profile URL which contains par1=…
        // in its share section. We do this on the same page (same JS
        // context, same ViewState) — re-creating from a saved HTML
        // wouldn't work because the postback needs the live state.
        let extractedPar1: string | undefined;
        let extractedTeamName: string | undefined;
        if (criteria.extractPar1ForTeamSubstring) {
          const needle = criteria.extractPar1ForTeamSubstring.toLowerCase();
          // Find the first anchor whose text includes the substring
          // and whose href is a doPostBack into the rptYearTeamsInfo
          // repeater (skip chrome links like paging/sort).
          const found = await page.evaluate(
            `(() => {
              const needle = ${JSON.stringify(needle)};
              const anchors = document.querySelectorAll("a[href*='__doPostBack']");
              for (const a of Array.from(anchors)) {
                const href = a.getAttribute("href") || "";
                if (!/rptYearTeamsInfo/.test(href)) continue;
                const text = (a.textContent || "").trim();
                if (text.toLowerCase().includes(needle)) {
                  return { anchorId: a.id, teamName: text };
                }
              }
              return null;
            })()`
          ) as { anchorId: string; teamName: string } | null;
          if (!found) {
            throw new Error(
              `submitTeamSearch: no team row matched substring "${criteria.extractPar1ForTeamSubstring}"`
            );
          }
          extractedTeamName = found.teamName.replace(/\s+/g, " ");
          // Click the postback anchor and wait for navigation to the
          // team-profile page (same trick as clickPostback).
          const beforeUrl = page.url();
          const navPromise = page
            .waitForURL((u) => u.toString() !== beforeUrl, {
              waitUntil: "domcontentloaded",
              timeout: 30000,
            })
            .catch(() => undefined);
          await page.click(`#${cssEscape(found.anchorId)}`);
          await navPromise;
          const destUrl = page.url();
          // par1= can appear in the destination URL as a query param
          // (hex) or in the page body's share-URL block. Try the URL
          // first, fall back to a body grep.
          const urlMatch = destUrl.match(/[?&#]par1=([^&]+)/);
          if (urlMatch) {
            extractedPar1 = decodeURIComponent(urlMatch[1]!);
          } else {
            const destBody = await page.content();
            const bodyMatches = [
              ...destBody.matchAll(/par1=([0-9A-Fa-f]{30,})/g),
            ];
            // Prefer matches inside share URLs (canonical form), which
            // typically include `:443/`. Otherwise take the first match.
            const preferred = bodyMatches.find((m) =>
              m.input!.slice(Math.max(0, m.index! - 100), m.index!).includes(
                ":443"
              )
            );
            extractedPar1 = (preferred ?? bodyMatches[0])?.[1];
          }
        }

        return {
          status: resp?.status() ?? 0,
          body,
          finalUrl,
          extractedPar1,
          extractedTeamName,
        };
      } finally {
        await page.close();
      }
    });
  }

  async close(): Promise<void> {
    if (this.context) {
      await this.context.close();
      this.context = undefined;
    }
    if (this.browser) {
      await this.browser.close();
      this.browser = undefined;
    }
  }

  private async openPage(): Promise<Page> {
    if (!this.context) await this.initContext();
    return this.context!.newPage();
  }

  private async initContext(): Promise<void> {
    // Dynamic import so consumers that never call into Playwright don't
    // pay the startup cost. Also keeps the type-only `import type` at
    // the top from triggering a runtime resolution.
    const { chromium } = await import("playwright");
    this.browser = await chromium.launch({ headless: this.headless });
    this.context = await this.browser.newContext({
      userAgent: this.session.userAgent,
    });
    await this.context.addCookies(sessionCookieToPlaywright(this.session));
  }

  private async runOnHost<T>(host: string, work: () => Promise<T>): Promise<T> {
    const prev = this.hostQueues.get(host);
    const ready = prev?.promise ?? Promise.resolve();
    const gate = ready.then(async () => {
      const lastFinish = prev?.lastFinishedAt ?? 0;
      const elapsed = Date.now() - lastFinish;
      const target =
        this.minDelayMs + Math.random() * (this.maxDelayMs - this.minDelayMs);
      if (elapsed < target) await sleep(target - elapsed);
    });
    const promise = gate.then(work);
    const queueEntry: Queue = { promise, lastFinishedAt: 0 };
    this.hostQueues.set(host, queueEntry);
    try {
      const result = await promise;
      queueEntry.lastFinishedAt = Date.now();
      return result;
    } finally {
      // Leave queue entry in place; the next call will await its promise.
    }
  }
}

// Escape characters that would otherwise be special in a CSS selector.
// ASP.NET ids never include real CSS-special chars, but defensively
// escape `$` (just in case a caller passes a $-form by mistake) and
// numeric leading chars per the CSS spec.
function cssEscape(s: string): string {
  return s.replace(/([!"#$%&'()*+,./:;<=>?@[\\\]^`{|}~])/g, "\\$1");
}

// The shape Playwright's addCookies() accepts — superset of what we set
// here. Defined inline so we don't pull a 'Cookie' type whose required
// fields drift between Playwright versions.
interface CookieParam {
  name: string;
  value: string;
  domain: string;
  path: string;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: "Lax" | "Strict" | "None";
}

// Convert a "Cookie: a=1; b=2" header into Playwright's addCookies()
// input. Every cookie targets .usta.com / "/" since that's where the
// user's session lives.
function sessionCookieToPlaywright(session: UstaSession): CookieParam[] {
  const pairs = session.cookieHeader.split(";");
  const out: CookieParam[] = [];
  for (const pair of pairs) {
    const eq = pair.indexOf("=");
    if (eq < 0) continue;
    const name = pair.slice(0, eq).trim();
    const value = pair.slice(eq + 1).trim();
    if (!name) continue;
    out.push({
      name,
      value,
      domain: ".usta.com",
      path: "/",
      httpOnly: false,
      secure: true,
      sameSite: "Lax",
    });
  }
  return out;
}
