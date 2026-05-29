// Shared re-auth hook for PoliteFetcher. When TENNIS_ACCOUNT is set, returns
// a callback that re-logins that account (forceRefresh) and yields fresh
// cookie + UA — so any long auth-walled crawl self-heals if its session
// expires mid-stream. Returns undefined when no account is configured
// (manual-session mode keeps the old "throw LoginRequiredError" behavior).

import { ensureSession } from "@tennis/scraper";

export function accountReauth():
  | (() => Promise<{ cookieHeader: string; userAgent: string }>)
  | undefined {
  const account = process.env.TENNIS_ACCOUNT;
  if (!account) return undefined;
  return async () => {
    console.error(
      `  (session expired mid-crawl — re-logging in "${account}"…)`
    );
    const { session } = await ensureSession({ account, forceRefresh: true });
    return { cookieHeader: session.cookieHeader, userAgent: session.userAgent };
  };
}
