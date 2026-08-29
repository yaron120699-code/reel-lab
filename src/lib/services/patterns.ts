import { preparePatternCard, type SupportingReelState } from "@/lib/patterns/prepare";
import type { PatternCard } from "@/lib/domain/types";
import type { Repositories } from "@/lib/repositories/types";

export type CreatePatternResult =
  | { ok: true; card: PatternCard; cappedFrom: "low" | "medium" | "high" | null }
  | { ok: false; errors: Record<string, string> };

async function resolveSupporting(
  repos: Repositories,
  reelIds: string[],
): Promise<SupportingReelState[]> {
  const states: SupportingReelState[] = [];
  for (const reelId of reelIds) {
    const reel = await repos.reels.findById(reelId);
    const analysis = reel ? await repos.analyses.latestForReel(reelId) : null;
    states.push({ reelId, exists: reel !== null, hasAnalysis: analysis !== null });
  }
  return states;
}

export async function createPatternCard(
  repos: Repositories,
  raw: unknown,
): Promise<CreatePatternResult> {
  const reelIds = Array.isArray((raw as { supportingReelIds?: unknown }).supportingReelIds)
    ? ((raw as { supportingReelIds: unknown[] }).supportingReelIds.filter(
        (value): value is string => typeof value === "string",
      ) as string[])
    : [];

  const supporting = await resolveSupporting(repos, reelIds);
  const prepared = preparePatternCard(raw, supporting);
  if (!prepared.ok) return prepared;

  const card = await repos.patterns.create(prepared.input);
  return { ok: true, card, cappedFrom: prepared.cappedFrom };
}
