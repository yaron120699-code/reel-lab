import "@/lib/server-only";

import { FIXTURE_SHORT_CODES, getFixtureAnalysis } from "@/lib/analysis/fixtures/analyses";
import { ANALYSIS_PROMPT_VERSION, parseAnalysisPayload } from "@/lib/analysis/schema";
import { normalizeApifyItem } from "@/lib/apify/normalize";
import { assessComparability } from "@/lib/compare/comparability";
import type { Repositories } from "@/lib/repositories/types";

import {
  DEMO_APIFY_ITEMS,
  DEMO_COMPARISON,
  DEMO_COMPETITOR,
  DEMO_PATTERN,
  DEMO_SEEDED_AT,
  demoAnalysisId,
  demoMetricsId,
  demoReelId,
} from "./fixtures";

export type SeedCounts = {
  competitors: number;
  reels: number;
  metrics: number;
  analyses: number;
  comparisons: number;
  patterns: number;
};

/**
 * Writes the canonical demo dataset with its fixed ids.
 *
 * Idempotent by construction: every row is looked up by its known id first, so
 * running this twice is a no-op rather than a duplicate. That matters because a
 * warm serverless instance may call it on every request.
 *
 * Media files are not seeded here. They live on disk, and a serverless
 * filesystem is not a place to put them — the local `seed:demo` script attaches
 * the generated MP4s separately.
 */
export async function seedCanonicalDemo(repos: Repositories): Promise<SeedCounts> {
  const counts: SeedCounts = {
    competitors: 0,
    reels: 0,
    metrics: 0,
    analyses: 0,
    comparisons: 0,
    patterns: 0,
  };

  const existingCompetitor = await repos.competitors.findById(DEMO_COMPETITOR.id as string);
  if (!existingCompetitor) {
    await repos.competitors.create(DEMO_COMPETITOR);
    counts.competitors += 1;
  }
  const competitorId = DEMO_COMPETITOR.id as string;

  for (const [index, item] of DEMO_APIFY_ITEMS.entries()) {
    // Run the real normalizer so the demo exercises the same code path a pasted
    // Apify export does, then pin the resulting row to its fixed id.
    const normalized = normalizeApifyItem(item, index);
    if ("reason" in normalized) continue;

    const reelId = demoReelId(normalized.shortCode);

    if (!(await repos.reels.findById(reelId))) {
      await repos.reels.create({
        id: reelId,
        competitorId,
        sourceUrl: normalized.sourceUrl,
        shortCode: normalized.shortCode,
        caption: normalized.caption,
        publishedAt: normalized.publishedAt,
        durationSeconds: normalized.durationSeconds,
        language: null,
        transcript: normalized.transcript,
        ownerUsername: normalized.ownerUsername,
        thumbnailUrl: normalized.thumbnailUrl,
        remoteVideoUrl: normalized.remoteVideoUrl,
        tags: [...new Set([...normalized.tags, "דמו"])],
        importSource: "demo-fixture",
        importedAt: DEMO_SEEDED_AT,
        rawPayload: normalized.raw,
      });
      counts.reels += 1;
    }

    if (!(await repos.metrics.latestForReel(reelId))) {
      await repos.metrics.record({
        id: demoMetricsId(normalized.shortCode),
        reelId,
        playCount: normalized.playCount,
        likesCount: normalized.likesCount,
        commentsCount: normalized.commentsCount,
        capturedAt: DEMO_SEEDED_AT,
        source: "demo-fixture",
      });
      counts.metrics += 1;
    }
  }

  for (const shortCode of FIXTURE_SHORT_CODES) {
    const reelId = demoReelId(shortCode);
    if (!(await repos.reels.findById(reelId))) continue;
    if (await repos.analyses.latestForReel(reelId)) continue;

    const fixture = getFixtureAnalysis(shortCode);
    if (!fixture) continue;

    // Validated before storage: a fixture that drifted out of schema is a bug
    // worth failing on, not something to quietly persist.
    const parsed = parseAnalysisPayload(fixture);
    if (!parsed.ok) {
      throw new Error(`Demo fixture ${shortCode} does not match the analysis schema.`);
    }

    await repos.analyses.create({
      id: demoAnalysisId(shortCode),
      reelId,
      promptVersion: ANALYSIS_PROMPT_VERSION,
      transcriptRef: `reel:${reelId}#transcript`,
      language: parsed.payload.language.value,
      provider: "fixture",
      model: null,
      runMode: "fixture",
      analysedAt: DEMO_SEEDED_AT,
      payload: parsed.payload,
    });
    counts.analyses += 1;
  }

  const reelAId = demoReelId(DEMO_COMPARISON.reelAShortCode);
  const reelBId = demoReelId(DEMO_COMPARISON.reelBShortCode);

  const [reelA, reelB] = await Promise.all([
    repos.reels.findById(reelAId),
    repos.reels.findById(reelBId),
  ]);
  const [analysisA, analysisB] = await Promise.all([
    repos.analyses.latestForReel(reelAId),
    repos.analyses.latestForReel(reelBId),
  ]);

  const bothReady = reelA !== null && reelB !== null && analysisA !== null && analysisB !== null;

  if (bothReady && !(await repos.comparisons.findById(DEMO_COMPARISON.id))) {
    // Assessed directly against the repositories handed to this function. The
    // comparison service reaches for the global database, which is the wrong
    // one when a caller is seeding a specific instance.
    const [metricsA, metricsB] = await Promise.all([
      repos.metrics.latestForReel(reelAId),
      repos.metrics.latestForReel(reelBId),
    ]);

    const topicOf = (record: typeof analysisA): string | null => {
      const parsed = record ? parseAnalysisPayload(record.payload) : null;
      return parsed?.ok ? parsed.payload.topic.value : null;
    };

    const verdict = assessComparability(
      { reel: reelA, metrics: metricsA, topic: topicOf(analysisA) },
      { reel: reelB, metrics: metricsB, topic: topicOf(analysisB) },
    );

    await repos.comparisons.create({
      id: DEMO_COMPARISON.id,
      reelAId,
      reelBId,
      comparability: verdict,
      notes: DEMO_COMPARISON.notes,
    });
    counts.comparisons += 1;
  }

  if (bothReady && !(await repos.patterns.findById(DEMO_PATTERN.id))) {
    const supportingReelIds = DEMO_PATTERN.supportingShortCodes.map(demoReelId);
    await repos.patterns.create({
      id: DEMO_PATTERN.id,
      comparisonId: DEMO_PATTERN.comparisonId,
      title: DEMO_PATTERN.title,
      description: DEMO_PATTERN.description,
      whenUseful: DEMO_PATTERN.whenUseful,
      supportingReelIds,
      counterexamples: DEMO_PATTERN.counterexamples,
      evidenceCount: supportingReelIds.length,
      confidence: DEMO_PATTERN.confidence,
      baderechTranslation: DEMO_PATTERN.baderechTranslation,
      doNotCopyNote: DEMO_PATTERN.doNotCopyNote,
    });
    counts.patterns += 1;
  }

  return counts;
}
