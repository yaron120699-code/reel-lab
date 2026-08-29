import "@/lib/server-only";

import type { ReelAnalysisPayload } from "@/lib/analysis/schema";
import {
  assessComparability,
  creatorRelativePerformance,
  type ComparabilityVerdict,
  type PerformanceIndex,
} from "@/lib/compare/comparability";
import type { Competitor, Reel, ReelMetrics } from "@/lib/domain/types";
import { getRepositories } from "@/lib/repositories";

import { loadAnalysis } from "./analysis";

export type ComparisonSideView = {
  reel: Reel;
  competitor: Competitor;
  metrics: ReelMetrics | null;
  analysis: ReelAnalysisPayload | null;
  analysisRunMode: "live" | "fixture" | null;
  performance: PerformanceIndex;
};

export type ComparisonView = {
  left: ComparisonSideView;
  right: ComparisonSideView;
  verdict: ComparabilityVerdict;
};

export type ComparisonResult =
  | { ok: true; view: ComparisonView }
  | { ok: false; error: string; hint: string };

async function buildSide(reelId: string): Promise<ComparisonSideView | null> {
  const repos = getRepositories();
  const reel = await repos.reels.findById(reelId);
  if (!reel) return null;

  const competitor = await repos.competitors.findById(reel.competitorId);
  if (!competitor) return null;

  const metrics = await repos.metrics.latestForReel(reelId);
  const analysis = await loadAnalysis(reelId);
  const cohort = await repos.reels.cohortForCompetitor(reel.competitorId);

  return {
    reel,
    competitor,
    metrics,
    analysis: analysis?.payload ?? null,
    analysisRunMode: analysis?.record.runMode ?? null,
    performance: creatorRelativePerformance({ reel, metrics }, cohort),
  };
}

export async function buildComparison(
  reelAId: string,
  reelBId: string,
): Promise<ComparisonResult> {
  if (reelAId === reelBId) {
    return {
      ok: false,
      error: "בחרתם את אותו ריל פעמיים.",
      hint: "בחרו שני רילים שונים כדי להשוות ביניהם.",
    };
  }

  const [left, right] = await Promise.all([buildSide(reelAId), buildSide(reelBId)]);
  if (!left || !right) {
    return {
      ok: false,
      error: "אחד הרילים לא נמצא.",
      hint: "חזרו לספריית הרילים ובחרו שני רילים קיימים.",
    };
  }

  const verdict = assessComparability(
    { reel: left.reel, metrics: left.metrics, topic: left.analysis?.topic.value ?? null },
    { reel: right.reel, metrics: right.metrics, topic: right.analysis?.topic.value ?? null },
  );

  return { ok: true, view: { left, right, verdict } };
}

/** Persists a comparison so a Pattern Card can point back at its evidence. */
export async function saveComparison(view: ComparisonView, notes: string | null) {
  const repos = getRepositories();
  return repos.comparisons.create({
    reelAId: view.left.reel.id,
    reelBId: view.right.reel.id,
    comparability: view.verdict,
    notes,
  });
}
