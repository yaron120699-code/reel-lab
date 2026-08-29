import "@/lib/server-only";

import { AnalysisUnavailableError, getAnalysisProvider } from "@/lib/analysis/provider";
import { parseAnalysisPayload, type ReelAnalysisPayload } from "@/lib/analysis/schema";
import { getRepositories } from "@/lib/repositories";
import type { ReelAnalysisRecord } from "@/lib/domain/types";

export type LoadedAnalysis = {
  record: ReelAnalysisRecord;
  payload: ReelAnalysisPayload;
};

export type AnalysisOutcome =
  | { ok: true; analysis: LoadedAnalysis }
  | { ok: false; error: string; hint: string };

/** Returns the stored analysis for a reel, or null when none has been run. */
export async function loadAnalysis(reelId: string): Promise<LoadedAnalysis | null> {
  const repos = getRepositories();
  const record = await repos.analyses.latestForReel(reelId);
  if (!record) return null;

  const parsed = parseAnalysisPayload(record.payload);
  if (!parsed.ok) return null;

  return { record, payload: parsed.payload };
}

export async function runAnalysis(reelId: string): Promise<AnalysisOutcome> {
  const repos = getRepositories();
  const reel = await repos.reels.findById(reelId);
  if (!reel) {
    return { ok: false, error: "הריל לא נמצא.", hint: "חזרו לספריית הרילים ובחרו ריל קיים." };
  }

  const metrics = await repos.metrics.latestForReel(reelId);
  const media = await repos.media.listForReel(reelId);

  try {
    const provider = await getAnalysisProvider();
    const result = await provider.analyse({
      reel,
      transcript: reel.transcript,
      hasVideoFile: media.some((item) => item.kind === "video"),
      metrics: {
        playCount: metrics?.playCount ?? null,
        likesCount: metrics?.likesCount ?? null,
        commentsCount: metrics?.commentsCount ?? null,
      },
    });

    const record = await repos.analyses.create({
      reelId,
      promptVersion: result.promptVersion,
      transcriptRef: result.transcriptRef,
      language: result.language,
      provider: result.provider,
      model: result.model,
      runMode: result.runMode,
      analysedAt: result.analysedAt,
      payload: result.payload,
    });

    if (result.language && reel.language !== result.language) {
      await repos.reels.update(reelId, { language: result.language });
    }

    return { ok: true, analysis: { record, payload: result.payload } };
  } catch (error) {
    if (error instanceof AnalysisUnavailableError) {
      return { ok: false, error: error.message, hint: error.hint };
    }
    return {
      ok: false,
      error: "הניתוח נכשל ולא נשמר.",
      hint: "לא נשמר ניתוח חלקי. נסו שוב, או בדקו את הגדרת ספק הניתוח ב-.env.",
    };
  }
}
