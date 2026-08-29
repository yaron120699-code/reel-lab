import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fetchInstagramReel, parseInstagramReelUrl } from "@/lib/apify/client";

describe("parseInstagramReelUrl", () => {
  it("normalizes a mobile share URL and removes tracking parameters", () => {
    expect(
      parseInstagramReelUrl("https://www.instagram.com/reel/DW9s_eJjKgC/?igsh=secret"),
    ).toEqual({
      url: "https://www.instagram.com/reel/DW9s_eJjKgC/",
      shortCode: "DW9s_eJjKgC",
    });
  });

  it("rejects non-Instagram and non-reel URLs", () => {
    expect(parseInstagramReelUrl("https://example.com/reel/DW9s_eJjKgC/")).toBeNull();
    expect(parseInstagramReelUrl("https://www.instagram.com/lior/")) .toBeNull();
  });
});

describe("fetchInstagramReel", () => {
  beforeEach(() => {
    process.env.APIFY_API_TOKEN = "test-secret-token";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.APIFY_API_TOKEN;
  });

  it("keeps the token in a header and requests transcript without video download", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([{ shortCode: "DW9s_eJjKgC" }]), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchInstagramReel(
      "https://www.instagram.com/reel/DW9s_eJjKgC/?igsh=tracking",
    );

    expect(result.ok).toBe(true);
    const [requestUrl, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(requestUrl).not.toContain("test-secret-token");
    expect(requestUrl).not.toContain("token=");
    expect(init.headers).toMatchObject({ authorization: "Bearer test-secret-token" });
    expect(JSON.parse(String(init.body))).toEqual(
      expect.objectContaining({
        username: ["https://www.instagram.com/reel/DW9s_eJjKgC/"],
        includeTranscript: true,
        includeDownloadedVideo: false,
      }),
    );
  });

  it("does not expose a token echoed by a failed request", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("request failed with test-secret-token")),
    );

    const result = await fetchInstagramReel(
      "https://www.instagram.com/reel/DW9s_eJjKgC/",
    );
    expect(result.ok).toBe(false);
    expect(JSON.stringify(result)).not.toContain("test-secret-token");
  });
});
