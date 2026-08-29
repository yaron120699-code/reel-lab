import { describe, expect, it } from "vitest";

import { FIXTURE_ANALYSES } from "@/lib/analysis/fixtures/analyses";
import { ANALYSIS_FIELDS, parseAnalysisPayload } from "@/lib/analysis/schema";
import { creatorRelativePerformance, type PerformanceIndex } from "@/lib/compare/comparability";
import {
  STRONG_THRESHOLD,
  WEAK_THRESHOLD,
  bandForIndex,
  performanceLabel,
} from "@/lib/compare/performance-label";
import { DEMO_APIFY_ITEMS } from "@/lib/demo/fixtures";
import type { Reel, ReelMetrics } from "@/lib/domain/types";

function index(value: number, overrides: Partial<PerformanceIndex> = {}): PerformanceIndex {
  return {
    available: true,
    basis: "playCount",
    index: value,
    cohortSize: 5,
    cohortMedian: 100000,
    confidence: "medium",
    note: "יחסית לחציון הצפיות של 5 רילים אחרים של אותו יוצר.",
    ...overrides,
  };
}

describe("relative performance thresholds", () => {
  it("calls 1.5x and above strong", () => {
    expect(bandForIndex(STRONG_THRESHOLD)).toBe("strong");
    expect(bandForIndex(1.51)).toBe("strong");
    expect(bandForIndex(4.85)).toBe("strong");
    expect(performanceLabel(index(1.5)).label).toBe("חזק ביחס ליוצר");
  });

  it("calls 0.75x up to 1.49x typical", () => {
    expect(bandForIndex(WEAK_THRESHOLD)).toBe("typical");
    expect(bandForIndex(1.0)).toBe("typical");
    expect(bandForIndex(1.49)).toBe("typical");
    expect(performanceLabel(index(1.0)).label).toBe("בטווח הרגיל");
  });

  it("calls below 0.75x weak", () => {
    expect(bandForIndex(0.74)).toBe("weak");
    expect(bandForIndex(0.54)).toBe("weak");
    expect(performanceLabel(index(0.54)).label).toBe("חלש ביחס ליוצר");
  });

  it("sits exactly on the boundaries as specified", () => {
    expect(bandForIndex(1.4999)).toBe("typical");
    expect(bandForIndex(0.7499)).toBe("weak");
  });
});

describe("missing data", () => {
  it("reports insufficient data rather than guessing a band", () => {
    const label = performanceLabel(
      index(0, { available: false, index: null, basis: null, cohortSize: 1 }),
    );
    expect(label.band).toBe("unknown");
    expect(label.label).toBe("אין מספיק נתונים");
    expect(label.index).toBeNull();
  });

  it("stays unknown when the index is null even if marked available", () => {
    expect(performanceLabel(index(0, { index: null })).band).toBe("unknown");
  });

  it("refuses to band a reel with no view count, even when likes are available", () => {
    const label = performanceLabel(index(2, { basis: "likesCount", confidence: "low" }));
    expect(label.band).toBe("unknown");
    expect(label.label).toBe("אין מספיק נתונים");
    expect(label.index).toBeNull();
    // The likes ratio is still reported, just not turned into a signal.
    expect(label.caveat).toContain("לייקים");
    expect(label.caveat).toContain("×2.00");
  });
});

describe("the label never claims causation", () => {
  it("carries a caveat that denies proof on every view-based band", () => {
    for (const value of [4.85, 1.0, 0.4]) {
      const label = performanceLabel(index(value));
      expect(label.caveat).toContain("לא הוכחה");
    }
  });

  it("uses comparative wording, not evaluative wording", () => {
    for (const value of [4.85, 1.0, 0.4]) {
      const label = performanceLabel(index(value));
      expect(label.label).not.toContain("טוב");
      expect(label.label).not.toContain("מצליח");
      expect(label.label).not.toContain("הצליח");
    }
  });
});

describe("labels over a real creator cohort", () => {
  function reelFrom(shortCode: string): Reel {
    return {
      id: `demo-reel-${shortCode}`,
      competitorId: "demo-competitor-lior",
      sourceUrl: `https://www.instagram.com/reel/${shortCode}/`,
      shortCode,
      caption: null,
      publishedAt: "2026-05-01T00:00:00.000Z",
      durationSeconds: 45,
      language: "he",
      transcript: null,
      ownerUsername: "lior.demo.reels",
      thumbnailUrl: null,
      remoteVideoUrl: null,
      tags: [],
      importSource: "demo-fixture",
      importedAt: "2026-05-15T09:00:00.000Z",
      rawPayload: {},
      createdAt: "2026-05-15T09:00:00.000Z",
      updatedAt: "2026-05-15T09:00:00.000Z",
    };
  }

  function metricsFrom(shortCode: string, playCount: number | null): ReelMetrics {
    return {
      id: `demo-metrics-${shortCode}`,
      reelId: `demo-reel-${shortCode}`,
      playCount,
      likesCount: 1000,
      commentsCount: 10,
      capturedAt: "2026-05-15T09:00:00.000Z",
      source: "demo-fixture",
    };
  }

  const cohort = DEMO_APIFY_ITEMS.map((item) => ({
    reel: reelFrom(item.shortCode),
    metrics: metricsFrom(item.shortCode, item.videoPlayCount),
  }));

  it("labels the demo hook reel strong and the slow reel weak", () => {
    const target = (shortCode: string) =>
      cohort.find((entry) => entry.reel.shortCode === shortCode)!;

    const hook = performanceLabel(creatorRelativePerformance(target("DEMOhook01"), cohort));
    const slow = performanceLabel(creatorRelativePerformance(target("DEMOslow02"), cohort));

    expect(hook.band).toBe("strong");
    expect(slow.band).toBe("weak");
  });

  it("shows the no-view demo reel as insufficient data rather than weak", () => {
    const archive = cohort.find((entry) => entry.reel.shortCode === "DEMOold006")!;
    expect(archive.metrics.playCount).toBeNull();

    const label = performanceLabel(creatorRelativePerformance(archive, cohort));
    expect(label.band).toBe("unknown");
    expect(label.label).toBe("אין מספיק נתונים");
  });
});

describe("the decision summary draws only on stored analysis fields", () => {
  const SUMMARY_FIELD_KEYS = [
    "verbalHook",
    "hookMechanism",
    "openLoops",
    "payoff",
    "transferableLesson",
  ] as const;

  it("names five fields that all exist in the analysis schema", () => {
    const known = new Set(ANALYSIS_FIELDS.map((field) => field.key));
    expect(SUMMARY_FIELD_KEYS).toHaveLength(5);
    for (const key of SUMMARY_FIELD_KEYS) {
      expect(known.has(key), `${key} must be a real analysis field`).toBe(true);
    }
  });

  it("finds every summary field populated in the shipped fixtures", () => {
    for (const [shortCode, fixture] of Object.entries(FIXTURE_ANALYSES)) {
      const parsed = parseAnalysisPayload(fixture);
      if (!parsed.ok) throw new Error(`${shortCode}: ${parsed.issues.join(" | ")}`);

      expect(parsed.payload.verbalHook.value.length).toBeGreaterThan(0);
      expect(parsed.payload.hookMechanism.value.length).toBeGreaterThan(0);
      expect(parsed.payload.payoff.value.length).toBeGreaterThan(0);
      expect(parsed.payload.transferableLesson.value.length).toBeGreaterThan(0);
      expect(Array.isArray(parsed.payload.openLoops.items)).toBe(true);
    }
  });

  it("keeps the hook mechanism inferred, so the summary must frame it as a hypothesis", () => {
    for (const fixture of Object.values(FIXTURE_ANALYSES)) {
      const parsed = parseAnalysisPayload(fixture);
      if (!parsed.ok) throw new Error(parsed.issues.join(" | "));
      expect(parsed.payload.hookMechanism.evidence).toBe("inferred");
      expect(parsed.payload.hookMechanism.confidence).toBeDefined();
    }
  });
});

describe("thumbnails", () => {
  it("ships no demo thumbnail URLs, so no demo card can render a broken image", () => {
    for (const item of DEMO_APIFY_ITEMS) {
      expect("displayUrl" in item).toBe(false);
    }
  });
});
