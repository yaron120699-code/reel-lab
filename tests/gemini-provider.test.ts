import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { FIXTURE_ANALYSES } from "@/lib/analysis/fixtures/analyses";
import { AnalysisUnavailableError, type AnalysisInput } from "@/lib/analysis/provider";
import { ANALYSIS_PROMPT_VERSION } from "@/lib/analysis/schema";
import type { Reel } from "@/lib/domain/types";

/**
 * These tests never reach Google. `fetch` is replaced for every case, and one
 * test asserts that it is not called at all when no key is configured.
 */

const API_KEY = "test-key-not-a-real-credential";

const REEL: Reel = {
  id: "reel-under-test",
  competitorId: "creator-1",
  sourceUrl: "https://www.instagram.com/reel/ABC123/",
  shortCode: "ABC123",
  caption: "כיתוב לבדיקה",
  publishedAt: "2026-05-01T00:00:00.000Z",
  durationSeconds: 44,
  language: "he",
  transcript: "תמלול לבדיקה",
  ownerUsername: "creator",
  thumbnailUrl: null,
  remoteVideoUrl: null,
  tags: [],
  importSource: "apify-json-manual",
  importedAt: "2026-05-02T00:00:00.000Z",
  rawPayload: {},
  createdAt: "2026-05-02T00:00:00.000Z",
  updatedAt: "2026-05-02T00:00:00.000Z",
};

const INPUT: AnalysisInput = {
  reel: REEL,
  transcript: REEL.transcript,
  hasVideoFile: false,
  metrics: { playCount: 120000, likesCount: 5000, commentsCount: 90 },
};

function geminiResponse(text: string, extra: Record<string, unknown> = {}) {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      candidates: [{ content: { parts: [{ text }] }, finishReason: "STOP" }],
      ...extra,
    }),
  } as unknown as Response;
}

function errorResponse(status: number) {
  return {
    ok: false,
    status,
    // If anything ever read this body, the test below would catch it leaking.
    json: async () => ({ error: { message: `key=${API_KEY} leaked in body` } }),
  } as unknown as Response;
}

const VALID_PAYLOAD = JSON.stringify(FIXTURE_ANALYSES.DEMOhook01);

let originalEnv: Record<string, string | undefined>;

beforeEach(() => {
  originalEnv = {
    ANALYSIS_PROVIDER: process.env.ANALYSIS_PROVIDER,
    ANALYSIS_API_KEY: process.env.ANALYSIS_API_KEY,
    ANALYSIS_MODEL: process.env.ANALYSIS_MODEL,
  };
});

afterEach(() => {
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function configureGemini(model = "gemini-2.5-flash-lite") {
  process.env.ANALYSIS_PROVIDER = "gemini";
  process.env.ANALYSIS_API_KEY = API_KEY;
  process.env.ANALYSIS_MODEL = model;
}

async function runGemini() {
  const { createGeminiAnalysisProvider } = await import("@/lib/analysis/providers/gemini");
  return createGeminiAnalysisProvider().analyse(INPUT);
}

describe("provider selection", () => {
  it("resolves gemini when selected and keyed", async () => {
    configureGemini();
    const { getAnalysisProvider } = await import("@/lib/analysis/provider");
    const provider = await getAnalysisProvider();

    expect(provider.id).toBe("gemini");
    expect(provider.runMode).toBe("live");
    expect(provider.model).toBe("gemini-2.5-flash-lite");
  });

  it("falls back to fixture when gemini is selected without a key", async () => {
    process.env.ANALYSIS_PROVIDER = "gemini";
    process.env.ANALYSIS_API_KEY = "";

    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const { getAnalysisProvider } = await import("@/lib/analysis/provider");
    const provider = await getAnalysisProvider();

    expect(provider.id).toBe("fixture");
    expect(provider.runMode).toBe("fixture");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("still resolves anthropic, which this change must not disturb", async () => {
    process.env.ANALYSIS_PROVIDER = "anthropic";
    process.env.ANALYSIS_API_KEY = API_KEY;
    process.env.ANALYSIS_MODEL = "claude-sonnet-4-5";

    const { getAnalysisProvider } = await import("@/lib/analysis/provider");
    const provider = await getAnalysisProvider();

    expect(provider.id).toBe("anthropic");
  });

  it("treats an unknown provider name as fixture", async () => {
    process.env.ANALYSIS_PROVIDER = "gemeni";
    process.env.ANALYSIS_API_KEY = API_KEY;

    const { serverEnv } = await import("@/lib/config/env");
    expect(serverEnv.analysisProvider).toBe("fixture");

    const { getAnalysisProvider } = await import("@/lib/analysis/provider");
    expect((await getAnalysisProvider()).id).toBe("fixture");
  });

  it("reports gemini as live in the public runtime flags without leaking the key", async () => {
    configureGemini();
    const { publicRuntimeFlags } = await import("@/lib/config/env");
    const flags = publicRuntimeFlags();

    expect(flags.analysisProvider).toBe("gemini");
    expect(flags.liveAnalysisConfigured).toBe(true);
    expect(JSON.stringify(flags)).not.toContain(API_KEY);
  });
});

describe("a successful Gemini analysis", () => {
  it("parses, validates and returns the payload with provenance", async () => {
    configureGemini();
    const fetchSpy = vi.fn(async () => geminiResponse(VALID_PAYLOAD));
    vi.stubGlobal("fetch", fetchSpy);

    const result = await runGemini();

    expect(result.provider).toBe("gemini");
    expect(result.runMode).toBe("live");
    expect(result.model).toBe("gemini-2.5-flash-lite");
    expect(result.promptVersion).toBe(ANALYSIS_PROMPT_VERSION);
    expect(result.transcriptRef).toBe("reel:reel-under-test#transcript");
    expect(result.payload.retentionMechanisms.evidence).toBe("inferred");
  });

  it("calls the REST endpoint with the key in the header only", async () => {
    configureGemini();
    const fetchSpy = vi.fn(async () => geminiResponse(VALID_PAYLOAD));
    vi.stubGlobal("fetch", fetchSpy);

    await runGemini();

    const [url, init] = fetchSpy.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent",
    );
    // The key must never travel in the query string, where proxies log it.
    expect(url).not.toContain(API_KEY);
    expect(url).not.toContain("key=");

    const headers = init.headers as Record<string, string>;
    expect(headers["x-goog-api-key"]).toBe(API_KEY);
  });

  it("asks for JSON and caps the output size", async () => {
    configureGemini();
    const fetchSpy = vi.fn(async () => geminiResponse(VALID_PAYLOAD));
    vi.stubGlobal("fetch", fetchSpy);

    await runGemini();

    const [, init] = fetchSpy.mock.calls[0] as unknown as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    expect(body.generationConfig.responseMimeType).toBe("application/json");
    expect(body.generationConfig.maxOutputTokens).toBeGreaterThan(0);
    expect(body.systemInstruction.parts[0].text).toContain("retentionMechanisms");
  });

  it("tells the model it has no video, so no visual claim can be dressed as observed", async () => {
    configureGemini();
    const fetchSpy = vi.fn(async () => geminiResponse(VALID_PAYLOAD));
    vi.stubGlobal("fetch", fetchSpy);

    await runGemini();

    const [, init] = fetchSpy.mock.calls[0] as unknown as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    const prompt = body.contents[0].parts[0].text as string;

    expect(prompt).toContain("you have NOT been given the video file");
    expect(prompt).toContain("visualHook");
    // The shared prompt is still the basis of the request.
    expect(prompt).toContain("shortCode: ABC123");
  });

  it("accepts a payload wrapped in a markdown fence", async () => {
    configureGemini();
    vi.stubGlobal("fetch", async () => geminiResponse("```json\n" + VALID_PAYLOAD + "\n```"));

    const result = await runGemini();
    expect(result.provider).toBe("gemini");
  });

  it("joins multi-part responses before parsing", async () => {
    configureGemini();
    const half = Math.floor(VALID_PAYLOAD.length / 2);
    vi.stubGlobal(
      "fetch",
      async () =>
        ({
          ok: true,
          status: 200,
          json: async () => ({
            candidates: [
              {
                content: {
                  parts: [
                    { text: VALID_PAYLOAD.slice(0, half) },
                    { text: VALID_PAYLOAD.slice(half) },
                  ],
                },
                finishReason: "STOP",
              },
            ],
          }),
        }) as unknown as Response,
    );

    const result = await runGemini();
    expect(result.provider).toBe("gemini");
  });
});

describe("Gemini failures stay safe and Hebrew", () => {
  async function expectFailure(stub: unknown) {
    configureGemini();
    vi.stubGlobal("fetch", stub);
    try {
      await runGemini();
    } catch (error) {
      expect(error).toBeInstanceOf(AnalysisUnavailableError);
      return error as AnalysisUnavailableError;
    }
    throw new Error("expected the provider to fail");
  }

  it("turns a network error into a safe message", async () => {
    const error = await expectFailure(async () => {
      throw new Error(`connect ECONNREFUSED with x-goog-api-key: ${API_KEY}`);
    });
    expect(error.message).toContain("Gemini");
    expect(`${error.message} ${error.hint}`).not.toContain(API_KEY);
  });

  it("maps auth failures without echoing the response body", async () => {
    for (const status of [400, 401, 403]) {
      const error = await expectFailure(async () => errorResponse(status));
      expect(error.message).toContain("הרשאה");
      expect(`${error.message} ${error.hint}`).not.toContain(API_KEY);
      vi.unstubAllGlobals();
    }
  });

  it("maps a quota error to a rate-limit message", async () => {
    const error = await expectFailure(async () => errorResponse(429));
    expect(error.message).toContain("מכסת");
  });

  it("maps a missing model to a model message", async () => {
    const error = await expectFailure(async () => errorResponse(404));
    expect(error.hint).toContain("gemini-2.5-flash-lite");
  });

  it("maps a server error to a temporary-outage message", async () => {
    const error = await expectFailure(async () => errorResponse(503));
    expect(error.message).toContain("אינו זמין");
  });

  it("refuses malformed JSON rather than saving something invented", async () => {
    const error = await expectFailure(async () => geminiResponse("this is not json at all"));
    expect(error.message).toContain("JSON");
    expect(error.hint).toContain("לא נשמר ניתוח");
  });

  it("refuses an empty response", async () => {
    const error = await expectFailure(async () => geminiResponse(""));
    expect(error.message).toContain("ריקה");
  });

  it("refuses a truncated response", async () => {
    const error = await expectFailure(
      async () =>
        ({
          ok: true,
          status: 200,
          json: async () => ({
            candidates: [{ content: { parts: [{ text: "{" }] }, finishReason: "MAX_TOKENS" }],
          }),
        }) as unknown as Response,
    );
    expect(error.message).toContain("נקטעה");
  });

  it("refuses a blocked prompt", async () => {
    const error = await expectFailure(
      async () =>
        ({
          ok: true,
          status: 200,
          json: async () => ({ promptFeedback: { blockReason: "SAFETY" } }),
        }) as unknown as Response,
    );
    expect(error.message).toContain("חסמה");
  });

  it("refuses valid JSON that breaks the evidence contract", async () => {
    const broken = structuredClone(FIXTURE_ANALYSES.DEMOhook01) as Record<string, unknown>;
    // Retention presented as measured — exactly the claim the lab must reject.
    broken.retentionMechanisms = {
      items: ["עקומת שימור"],
      evidence: "measured",
      sourceField: "retentionCurve",
    };

    const error = await expectFailure(async () => geminiResponse(JSON.stringify(broken)));
    expect(error.message).toContain("סכמת הניתוח");
    expect(error.hint).toContain("retention");
  });

  it("rejects an unsafe model name before any request is made", async () => {
    configureGemini("../../evil:generateContent?key=leak");
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    await expect(runGemini()).rejects.toBeInstanceOf(AnalysisUnavailableError);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
