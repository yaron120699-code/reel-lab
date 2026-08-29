import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * Walks the acceptance criteria end to end against a real SQLite file:
 * add a competitor, import Apify JSON, attach an MP4, open an analysis,
 * compare two reels, save a Pattern Card, then reopen the database and confirm
 * nothing was lost.
 *
 * Environment is set before any import so the services pick up the temporary
 * paths rather than the developer's own data.
 */

let workDir: string;

beforeAll(() => {
  workDir = fs.mkdtempSync(path.join(os.tmpdir(), "baderech-e2e-"));
  process.env.DATABASE_FILE = path.join(workDir, "app.db");
  process.env.STORAGE_DIR = path.join(workDir, "uploads");
  process.env.ANALYSIS_PROVIDER = "fixture";
  process.env.ANALYSIS_API_KEY = "";
  process.env.APIFY_API_TOKEN = "";
});

afterAll(() => {
  fs.rmSync(workDir, { recursive: true, force: true });
});

describe("the full research flow", () => {
  it("carries a finding from import through to a saved pattern, and survives a reload", async () => {
    const { DEMO_APIFY_JSON, DEMO_COMPETITOR } = await import("@/lib/demo/data");
    const { getRepositories } = await import("@/lib/repositories");
    const { importApifyJson, attachVideoFile } = await import("@/lib/services/import");
    const { runAnalysis, loadAnalysis } = await import("@/lib/services/analysis");
    const { buildComparison, saveComparison } = await import("@/lib/services/comparison");
    const { createPatternCard } = await import("@/lib/services/patterns");

    const repos = getRepositories();

    // 1. Add a competitor.
    const competitor = await repos.competitors.create(DEMO_COMPETITOR);
    expect(await repos.competitors.findByUsername(DEMO_COMPETITOR.instagramUsername)).not.toBeNull();

    // 2. Import an Apify JSON result.
    const imported = await importApifyJson({
      competitorId: competitor.id,
      json: DEMO_APIFY_JSON,
      tags: ["בדיקה"],
    });
    expect(imported.ok).toBe(true);
    if (!imported.ok) return;
    expect(imported.outcome.created).toHaveLength(6);

    // 3. The reels show up in the library with their public metrics intact.
    const library = await repos.reels.list();
    expect(library).toHaveLength(6);

    const hook = library.find((item) => item.reel.shortCode === "DEMOhook01");
    const slow = library.find((item) => item.reel.shortCode === "DEMOslow02");
    const archive = library.find((item) => item.reel.shortCode === "DEMOold006");
    expect(hook?.metrics?.playCount).toBe(412000);
    expect(slow?.metrics?.playCount).toBe(58000);
    // The archive reel had no play count in the source and must not have gained one.
    expect(archive?.metrics?.playCount).toBeNull();
    expect(archive?.metrics?.likesCount).toBe(2900);

    // 4. Associate an MP4 with a reel.
    const attached = await attachVideoFile({
      reelId: hook!.reel.id,
      filename: "DEMOhook01.mp4",
      mimeType: "video/mp4",
      bytes: Buffer.from("not a real encoding, but a real file on disk"),
    });
    expect(attached.ok).toBe(true);

    const media = await repos.media.listForReel(hook!.reel.id);
    expect(media).toHaveLength(1);
    expect(fs.existsSync(path.join(process.env.STORAGE_DIR as string, media[0].storageKey))).toBe(
      true,
    );

    // 5. Open a structured analysis on both reels.
    for (const reelId of [hook!.reel.id, slow!.reel.id]) {
      const outcome = await runAnalysis(reelId);
      expect(outcome.ok).toBe(true);
      if (!outcome.ok) return;
      expect(outcome.analysis.record.runMode).toBe("fixture");
      expect(outcome.analysis.record.promptVersion).toBeTruthy();
      expect(outcome.analysis.payload.retentionMechanisms.evidence).toBe("inferred");
    }

    // A reel with no pre-baked fixture is refused rather than invented.
    const refused = await runAnalysis(archive!.reel.id);
    expect(refused.ok).toBe(false);
    if (refused.ok) return;
    expect(refused.hint).toContain("ANALYSIS_PROVIDER");

    // 6. Compare the two analysed reels.
    const comparison = await buildComparison(hook!.reel.id, slow!.reel.id);
    expect(comparison.ok).toBe(true);
    if (!comparison.ok) return;

    expect(comparison.view.verdict.level).toBe("reasonable");
    expect(comparison.view.left.performance.available).toBe(true);
    expect(comparison.view.left.performance.basis).toBe("playCount");
    expect(comparison.view.left.performance.index).toBeGreaterThan(
      comparison.view.right.performance.index ?? 0,
    );

    const saved = await saveComparison(comparison.view, "ההוק הפותח שונה לגמרי.");
    expect(saved.id).toBeTruthy();

    // Comparing against the archive reel is flagged as unsafe.
    const unsafe = await buildComparison(hook!.reel.id, archive!.reel.id);
    expect(unsafe.ok).toBe(true);
    if (!unsafe.ok) return;
    expect(unsafe.view.verdict.level).toBe("unsafe");

    // 7. Save a Pattern Card backed by the comparison.
    const pattern = await createPatternCard(repos, {
      comparisonId: saved.id,
      title: "הקונפליקט המרכזי מופיע בחמש השניות הראשונות",
      description: "הפתיחה שוללת את ההסבר המתבקש ומשאירה שאלה פתוחה אחת בלבד.",
      whenUseful: "כשיש אירוע קונקרטי אחד שאפשר לפתוח ממנו.",
      supportingReelIds: [hook!.reel.id, slow!.reel.id],
      counterexamples: "המדגם קטן, ושני הרילים מאותו יוצר.",
      confidence: "high",
      baderechTranslation: "לפתוח באירוע קונקרטי או בסתירה לא פתורה.",
      doNotCopyNote: "לא להעתיק ניסוח, פרסונה או שמות מקומות.",
    });

    expect(pattern.ok).toBe(true);
    if (!pattern.ok) return;
    expect(pattern.card.evidenceCount).toBe(2);
    expect(pattern.card.confidence).toBe("medium");
    expect(pattern.cappedFrom).toBe("high");

    // 8. Reload: close the connection and read everything back from disk.
    const { closeDb } = await import("@/lib/db/client");
    closeDb();

    const reopened = getRepositories();
    expect(await reopened.competitors.list()).toHaveLength(1);
    expect(await reopened.reels.list()).toHaveLength(6);
    expect(await reopened.patterns.list()).toHaveLength(1);

    const reloadedAnalysis = await loadAnalysis(hook!.reel.id);
    expect(reloadedAnalysis).not.toBeNull();
    expect(reloadedAnalysis?.payload.verbalHook.evidence).toBe("observed");

    const stats = await reopened.reels.statsByCompetitor();
    expect(stats[0].importedReels).toBe(6);
    expect(stats[0].analysedReels).toBe(2);
    expect(stats[0].reelsWithPlayCount).toBe(5);
  });
});
