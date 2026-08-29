import { beforeEach, describe, expect, it } from "vitest";

import { FIXTURE_ANALYSES } from "@/lib/analysis/fixtures/analyses";
import { ANALYSIS_PROMPT_VERSION } from "@/lib/analysis/schema";
import { createDatabase, type Db } from "@/lib/db/client";
import { capConfidence, deriveEvidenceCount, preparePatternCard } from "@/lib/patterns/prepare";
import { createSqliteRepositories } from "@/lib/repositories/sqlite";
import type { Repositories } from "@/lib/repositories/types";
import { createPatternCard } from "@/lib/services/patterns";

const BASE_FORM = {
  title: "הקונפליקט המרכזי מופיע בחמש השניות הראשונות",
  description: "הפתיחה שוללת את ההסבר המתבקש ומשאירה שאלה פתוחה אחת.",
  whenUseful: "כשיש אירוע קונקרטי אחד שאפשר לפתוח ממנו.",
  counterexamples: "המדגם עדיין קטן, ושני הרילים מאותו יוצר.",
  confidence: "medium" as const,
  baderechTranslation: "לפתוח באירוע קונקרטי או בסתירה לא פתורה.",
  doNotCopyNote: "לא להעתיק ניסוח, פרסונה או שמות מקומות.",
};

describe("deriveEvidenceCount", () => {
  it("counts only reels that exist and have an analysis", () => {
    expect(
      deriveEvidenceCount([
        { reelId: "a", exists: true, hasAnalysis: true },
        { reelId: "b", exists: true, hasAnalysis: false },
        { reelId: "c", exists: false, hasAnalysis: false },
      ]),
    ).toBe(1);
  });
});

describe("capConfidence", () => {
  it("caps high confidence below three analysed reels", () => {
    expect(capConfidence("high", 1)).toBe("low");
    expect(capConfidence("high", 2)).toBe("medium");
    expect(capConfidence("high", 3)).toBe("high");
  });

  it("never raises a confidence the researcher did not ask for", () => {
    expect(capConfidence("low", 9)).toBe("low");
    expect(capConfidence("medium", 9)).toBe("medium");
  });
});

describe("preparePatternCard", () => {
  it("refuses a card with no analysed evidence behind it", () => {
    const result = preparePatternCard(
      { ...BASE_FORM, supportingReelIds: ["a"] },
      [{ reelId: "a", exists: true, hasAnalysis: false }],
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.supportingReelIds).toContain("אין ראיה");
  });

  it("refuses a card pointing at a deleted reel", () => {
    const result = preparePatternCard(
      { ...BASE_FORM, supportingReelIds: ["gone"] },
      [{ reelId: "gone", exists: false, hasAnalysis: false }],
    );
    expect(result.ok).toBe(false);
  });

  it("reports missing required fields", () => {
    const result = preparePatternCard(
      { ...BASE_FORM, title: "", supportingReelIds: ["a"] },
      [{ reelId: "a", exists: true, hasAnalysis: true }],
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.title).toBeDefined();
  });

  it("derives the evidence count rather than trusting the form", () => {
    const result = preparePatternCard(
      { ...BASE_FORM, evidenceCount: 99, supportingReelIds: ["a", "b"] },
      [
        { reelId: "a", exists: true, hasAnalysis: true },
        { reelId: "b", exists: true, hasAnalysis: true },
      ],
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.input.evidenceCount).toBe(2);
  });

  it("caps the requested confidence and reports that it did", () => {
    const result = preparePatternCard(
      { ...BASE_FORM, confidence: "high", supportingReelIds: ["a", "b"] },
      [
        { reelId: "a", exists: true, hasAnalysis: true },
        { reelId: "b", exists: true, hasAnalysis: true },
      ],
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.input.confidence).toBe("medium");
    expect(result.cappedFrom).toBe("high");
  });
});

describe("createPatternCard against the repositories", () => {
  let db: Db;
  let repos: Repositories;
  let reelIds: string[];

  beforeEach(async () => {
    db = createDatabase(":memory:");
    repos = createSqliteRepositories(db);

    const competitor = await repos.competitors.create({
      displayName: "יוצר בדיקה",
      instagramUsername: "test.creator",
      profileUrl: "https://www.instagram.com/test.creator/",
      country: "IL",
      niche: "בדיקות",
      relevanceNote: "לצורך בדיקה",
      tags: [],
    });

    reelIds = [];
    for (const shortCode of ["DEMOhook01", "DEMOslow02", "NOANALYSIS"]) {
      const reel = await repos.reels.create({
        competitorId: competitor.id,
        sourceUrl: `https://www.instagram.com/reel/${shortCode}/`,
        shortCode,
        caption: null,
        publishedAt: "2026-05-01T00:00:00.000Z",
        durationSeconds: 45,
        language: "he",
        transcript: null,
        ownerUsername: "test.creator",
        thumbnailUrl: null,
        remoteVideoUrl: null,
        tags: [],
        importSource: "apify-json-manual",
        importedAt: "2026-05-02T00:00:00.000Z",
        rawPayload: {},
      });
      reelIds.push(reel.id);

      const fixture = FIXTURE_ANALYSES[shortCode];
      if (fixture) {
        await repos.analyses.create({
          reelId: reel.id,
          promptVersion: ANALYSIS_PROMPT_VERSION,
          transcriptRef: null,
          language: "עברית",
          provider: "fixture",
          model: null,
          runMode: "fixture",
          analysedAt: "2026-05-03T00:00:00.000Z",
          payload: fixture,
        });
      }
    }
  });

  it("saves a card and reads it back with its supporting reels", async () => {
    const result = await createPatternCard(repos, {
      ...BASE_FORM,
      supportingReelIds: [reelIds[0], reelIds[1]],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.card.evidenceCount).toBe(2);
    expect(result.card.confidence).toBe("medium");

    const stored = await repos.patterns.list();
    expect(stored).toHaveLength(1);
    expect(stored[0].title).toBe(BASE_FORM.title);
    expect(stored[0].supportingReelIds).toEqual([reelIds[0], reelIds[1]]);
    expect(stored[0].baderechTranslation).toBe(BASE_FORM.baderechTranslation);
    expect(stored[0].doNotCopyNote).toBe(BASE_FORM.doNotCopyNote);
  });

  it("counts only the analysed reel when one supporting reel has no analysis", async () => {
    const result = await createPatternCard(repos, {
      ...BASE_FORM,
      confidence: "high",
      supportingReelIds: [reelIds[0], reelIds[2]],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.card.evidenceCount).toBe(1);
    expect(result.card.confidence).toBe("low");
    expect(result.cappedFrom).toBe("high");
  });

  it("rejects a card whose only support has no analysis", async () => {
    const result = await createPatternCard(repos, {
      ...BASE_FORM,
      supportingReelIds: [reelIds[2]],
    });

    expect(result.ok).toBe(false);
    expect(await repos.patterns.list()).toHaveLength(0);
  });

  it("links a card to a saved comparison", async () => {
    const comparison = await repos.comparisons.create({
      reelAId: reelIds[0],
      reelBId: reelIds[1],
      comparability: { level: "reasonable" },
      notes: null,
    });

    const result = await createPatternCard(repos, {
      ...BASE_FORM,
      comparisonId: comparison.id,
      supportingReelIds: [reelIds[0], reelIds[1]],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.card.comparisonId).toBe(comparison.id);
  });

  it("removes a card", async () => {
    const result = await createPatternCard(repos, {
      ...BASE_FORM,
      supportingReelIds: [reelIds[0], reelIds[1]],
    });
    if (!result.ok) throw new Error("expected success");

    await repos.patterns.remove(result.card.id);
    expect(await repos.patterns.list()).toHaveLength(0);
  });
});
