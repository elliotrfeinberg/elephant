import { describe, expect, it, vi, beforeEach, type Mock } from "vitest";

// Mock undici.request so we can drive status codes without real network.
vi.mock("undici", () => ({ request: vi.fn() }));
import { request } from "undici";
import { PoliteFetcher } from "./politeFetch.js";
import { LoginRequiredError } from "./session.js";

const mockRequest = request as unknown as Mock;

function resp(
  statusCode: number,
  opts: { location?: string; body?: string } = {}
) {
  const headers: Record<string, string> = {};
  if (opts.location) headers.location = opts.location;
  return {
    statusCode,
    headers,
    body: { text: async () => opts.body ?? "" },
  };
}

const LOGIN = "https://account.usta.com/u/login?state=x";

describe("PoliteFetcher in-flight re-auth", () => {
  beforeEach(() => mockRequest.mockReset());

  it("re-auths once on a login redirect and retries with fresh creds", async () => {
    mockRequest
      .mockResolvedValueOnce(resp(302, { location: LOGIN })) // expired
      .mockResolvedValueOnce(resp(200, { body: "OK" })); // after re-auth

    const reauth = vi
      .fn()
      .mockResolvedValue({ cookieHeader: "fresh=1", userAgent: "UA2" });

    const f = new PoliteFetcher({
      userAgent: "UA1",
      contactEmail: "e@example.com",
      cookieHeader: "stale=1",
      minDelayMs: 0,
      maxDelayMs: 0,
      reauth,
    });

    const res = await f.fetch("https://tennislink.usta.com/page");
    expect(reauth).toHaveBeenCalledTimes(1);
    expect(res.status).toBe(200);
    expect(res.body).toBe("OK");
    // The retry must carry the refreshed cookie + UA.
    const retryHeaders = mockRequest.mock.calls[1]![1]!.headers;
    expect(retryHeaders.Cookie).toBe("fresh=1");
    expect(retryHeaders["User-Agent"]).toBe("UA2");
  });

  it("throws LoginRequiredError when no reauth hook is set", async () => {
    mockRequest.mockResolvedValueOnce(resp(302, { location: LOGIN }));
    const f = new PoliteFetcher({
      userAgent: "UA1",
      contactEmail: "e@example.com",
      cookieHeader: "stale=1",
      minDelayMs: 0,
      maxDelayMs: 0,
    });
    await expect(f.fetch("https://tennislink.usta.com/page")).rejects.toBeInstanceOf(
      LoginRequiredError
    );
  });

  it("gives up (LoginRequiredError) if it's still on login after one re-auth", async () => {
    mockRequest
      .mockResolvedValueOnce(resp(302, { location: LOGIN }))
      .mockResolvedValueOnce(resp(302, { location: LOGIN })); // still expired
    const reauth = vi
      .fn()
      .mockResolvedValue({ cookieHeader: "fresh=1", userAgent: "UA2" });
    const f = new PoliteFetcher({
      userAgent: "UA1",
      contactEmail: "e@example.com",
      cookieHeader: "stale=1",
      minDelayMs: 0,
      maxDelayMs: 0,
      reauth,
    });
    await expect(
      f.fetch("https://tennislink.usta.com/page")
    ).rejects.toBeInstanceOf(LoginRequiredError);
    expect(reauth).toHaveBeenCalledTimes(1);
  });
});
