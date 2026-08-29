import { describe, expect, it } from "vitest";

import {
  assessComparability,
  creatorRelativePerformance,
  type ComparisonSide,
} from "@/lib/compare/comparability";
import type { Reel, ReelMetrics } from "@/lib/domain/types";

function reel(overrides: Partial<Reel> = {}): Reel {
  return {
    id: "reel-a",
    competitorId: "creator-1",
    sourceUrl: "https://www.instagram.com/reel/AAA/",
    shortCode: "AAA",
    caption: null,
    publishedAt: "2026-05-01T00:00:00.000Z",
    durationSeconds: 45,
    language: "he",
    transcript: null,
    ownerUsername: "creator",
    thumbnailUrl: null,
    remoteVideoUrl: null,
    tags: ["מסע"],
    importSource: "apify-json-manual",
    importedAt: "2026-05-02T00:00:00.000Z",
    rawPayload: {},
    createdAt: "2026-05-02T00:00:00.000Z",
    updatedAt: "2026-05-02T00:00:00.000Z",
    ...overrides,
  };
}

function metrics(overrides: Partial<ReelMetrics> = {}): ReelMetrics {
  return {
    id: "m",
    reelId: "reel-a",
    playCount: 100000,
    likesCount: 5000,
    commentsCount: 100,
    capturedAt: "2026-05-02T00:00:00.000Z",
    source: "apify-json-manual",
    ...overrides,
  };
}

function side(r: Reel, m: ReelMetrics | null, topic: string | null = null): ComparisonSide {
  return { reel: r, metrics: m, topic };
}

describe("comparability", () => {
  it("calls a well-matched pair reasonable", () => {
    const a = side(reel(), metrics());
    const b = side(
      reel({ id: "reel-b", shortCode: "BBB", publishedAt: "2026-05-20T00:00:00.000Z" }),
      metrics({ reelId: "reel-b" }),
    );

    const verdict = assessComparability(a, b);
    expect(verdict.level).toBe("reasonable");
    expect(verdict.mismatches).toBe(0);
  });

  it("flags different creators", () => {
    const a = side(reel(), metrics());
    const b = side(reel({ id: "reel-b", competitorId: "creator-2" }), metrics({ reelId: "reel-b" }));

    const verdict = assessComparability(a, b);
    const check = verdict.checks.find((entry) => entry.key === "sameCreator");
    expect(check?.status).toBe("mismatch");
  });

  it("flags a wide gap in posting date and the timing confound it creates", () => {
    const a = side(reel(), metrics());
    const b = side(
      reel({ id: "reel-b", publishedAt: "2025-08-01T00:00:00.000Z" }),
      metrics({ reelId: "reel-b" }),
    );

    const verdict = assessComparability(a, b);
    expect(verdict.checks.find((entry) => entry.key === "similarPeriod")?.status).toBe("mismatch");
    expect(verdict.checks.find((entry) => entry.key === "seasonalConfound")?.status).toBe(
      "mismatch",
    );
  });

  it("marks a missing publish date as unknown rather than guessing", () => {
    const a = side(reel({ publishedAt: null }), metrics());
    const b = side(reel({ id: "reel-b" }), metrics({ reelId: "reel-b" }));

    const verdict = assessComparability(a, b);
    expect(verdict.checks.find((entry) => entry.key === "similarPeriod")?.status).toBe("unknown");
  });

  it("flags a missing play count on either side", () => {
    const a = side(reel(), metrics({ playCount: null }));
    const b = side(reel({ id: "reel-b" }), metrics({ reelId: "reel-b" }));

    const verdict = assessComparability(a, b);
    expect(verdict.checks.find((entry) => entry.key === "playCountAvailable")?.status).toBe(
      "mismatch",
    );
  });

  it("flags a large duration difference as a format mismatch", () => {
    const a = side(reel({ durationSeconds: 30 }), metrics());
    const b = side(reel({ id: "reel-b", durationSeconds: 95 }), metrics({ reelId: "reel-b" }));

    const verdict = assessComparability(a, b);
    expect(verdict.checks.find((entry) => entry.key === "similarFormat")?.status).toBe("mismatch");
  });

  it("matches topics on shared tags, then falls back to analysed topic text", () => {
    const shared = assessComparability(
      side(reel({ tags: ["מסע", "צפון"] }), metrics()),
      side(reel({ id: "reel-b", tags: ["מסע"] }), metrics({ reelId: "reel-b" })),
    );
    expect(shared.checks.find((entry) => entry.key === "similarTopic")?.status).toBe("match");

    const viaTopic = assessComparability(
      side(reel({ tags: [] }), metrics(), "עצירה לא מתוכננת בדרך צפונה"),
      side(reel({ id: "reel-b", tags: [] }), metrics({ reelId: "reel-b" }), "עצירה בדרך צפונה"),
    );
    expect(viaTopic.checks.find((entry) => entry.key === "similarTopic")?.status).toBe("match");

    const unknown = assessComparability(
      side(reel({ tags: [] }), metrics()),
      side(reel({ id: "reel-b", tags: [] }), metrics({ reelId: "reel-b" })),
    );
    expect(unknown.checks.find((entry) => entry.key === "similarTopic")?.status).toBe("unknown");
  });

  it("escalates to unsafe once three checks fail", () => {
    const a = side(reel({ durationSeconds: 25 }), metrics({ playCount: null }));
    const b = side(
      reel({
        id: "reel-b",
        competitorId: "creator-2",
        durationSeconds: 110,
        publishedAt: "2025-01-01T00:00:00.000Z",
        tags: ["אחר"],
      }),
      metrics({ reelId: "reel-b" }),
    );

    const verdict = assessComparability(a, b);
    expect(verdict.mismatches).toBeGreaterThanOrEqual(3);
    expect(verdict.level).toBe("unsafe");
    expect(verdict.headline).toContain("אינם ברי");
  });

  it("never claims causation in its headline", () => {
    const verdict = assessComparability(
      side(reel(), metrics()),
      side(reel({ id: "reel-b" }), metrics({ reelId: "reel-b" })),
    );
    expect(verdict.headline).toContain("סיבתיות");
  });
});

describe("creator-relative performance", () => {
  const cohort = [
    { reel: reel({ id: "c1" }), metrics: metrics({ reelId: "c1", playCount: 80000 }) },
    { reel: reel({ id: "c2" }), metrics: metrics({ reelId: "c2", playCount: 100000 }) },
    { reel: reel({ id: "c3" }), metrics: metrics({ reelId: "c3", playCount: 120000 }) },
  ];

  it("indexes a reel against its creator's median play count", () => {
    const result = creatorRelativePerformance(
      { reel: reel({ id: "target" }), metrics: metrics({ reelId: "target", playCount: 400000 }) },
      cohort,
    );

    expect(result.available).toBe(true);
    expect(result.basis).toBe("playCount");
    expect(result.cohortMedian).toBe(100000);
    expect(result.index).toBeCloseTo(4);
  });

  it("excludes the reel itself from its own cohort", () => {
    const target = { reel: reel({ id: "c2" }), metrics: metrics({ reelId: "c2", playCount: 100000 }) };
    const result = creatorRelativePerformance(target, cohort);
    expect(result.cohortSize).toBe(2);
    expect(result.available).toBe(false);
  });

  it("declines to produce a number when the cohort is too small", () => {
    const result = creatorRelativePerformance(
      { reel: reel({ id: "target" }), metrics: metrics({ reelId: "target" }) },
      cohort.slice(0, 2),
    );

    expect(result.available).toBe(false);
    expect(result.index).toBeNull();
    expect(result.note).toContain("3");
  });

  it("falls back to likes and drops to low confidence", () => {
    const likesCohort = cohort.map((entry, index) => ({
      reel: entry.reel,
      metrics: metrics({ reelId: entry.reel.id, playCount: null, likesCount: 4000 + index * 1000 }),
    }));

    const result = creatorRelativePerformance(
      {
        reel: reel({ id: "target" }),
        metrics: metrics({ reelId: "target", playCount: null, likesCount: 10000 }),
      },
      likesCohort,
    );

    expect(result.basis).toBe("likesCount");
    expect(result.confidence).toBe("low");
    expect(result.note).toContain("ודאות נמוכה");
  });

  it("reports high confidence only with a large cohort", () => {
    const wide = Array.from({ length: 8 }, (_, index) => ({
      reel: reel({ id: `w${index}` }),
      metrics: metrics({ reelId: `w${index}`, playCount: 90000 + index * 1000 }),
    }));

    const result = creatorRelativePerformance(
      { reel: reel({ id: "target" }), metrics: metrics({ reelId: "target", playCount: 200000 }) },
      wide,
    );

    expect(result.confidence).toBe("high");
  });
});
