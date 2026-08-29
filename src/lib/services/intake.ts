import "@/lib/server-only";

import { fetchInstagramReel, parseInstagramReelUrl } from "@/lib/apify/client";
import { normalizeApifyPayload } from "@/lib/apify/normalize";
import { getRepositories } from "@/lib/repositories";

import { runAnalysis } from "./analysis";
import { importApifyJson, type ImportOutcome } from "./import";

export type ReelIntakeResult =
  | {
      ok: true;
      reelId: string;
      imported: ImportOutcome;
      analysis: "created" | "already-existed" | "failed";
      analysisHint: string | null;
    }
  | { ok: false; error: string; hint: string };

/**
 * The one-click intake pipeline. Import is committed before analysis starts,
 * so a temporary Gemini failure never rolls back a successfully scraped reel.
 */
export async function ingestInstagramReel(url: string): Promise<ReelIntakeResult> {
  const target = parseInstagramReelUrl(url);
  if (!target) {
    return {
      ok: false,
      error: "כתובת הריל אינה תקינה.",
      hint: "הדביקו קישור מלא של ריל ציבורי באינסטגרם.",
    };
  }

  const fetched = await fetchInstagramReel(target.url);
  if (!fetched.ok) return fetched;

  const normalized = normalizeApifyPayload(fetched.items);
  if (!normalized.ok) {
    return {
      ok: false,
      error: normalized.error,
      hint: normalized.issues.slice(0, 3).join(" | "),
    };
  }

  const matched = normalized.reels.find((reel) => reel.shortCode === target.shortCode);
  if (!matched) {
    return {
      ok: false,
      error: "Apify החזירה ריל אחר מהקישור שנשלח.",
      hint: "לא נשמר דבר. נסו להעתיק מחדש את הקישור הישיר לריל.",
    };
  }
  if (!matched.ownerUsername) {
    return {
      ok: false,
      error: "לא זוהה שם המשתמש של יוצר הריל.",
      hint: "אפשר עדיין להשתמש בייבוא ה-JSON הידני ולבחור יוצר.",
    };
  }

  const repos = getRepositories();
  const competitor = await repos.competitors.findByUsername(matched.ownerUsername);
  if (!competitor) {
    return {
      ok: false,
      error: `@${matched.ownerUsername} עדיין לא נמצא ברשימת היוצרים.`,
      hint: "הוסיפו אותו פעם אחת בעמוד היוצרים, ואז שלחו שוב את אותו קישור.",
    };
  }

  // Import only the requested item even if an upstream Actor unexpectedly
  // returned additional results.
  const imported = await importApifyJson({
    competitorId: competitor.id,
    json: JSON.stringify([matched.raw]),
    importSource: "apify-api",
  });
  if (!imported.ok) {
    return {
      ok: false,
      error: imported.error,
      hint: imported.issues.slice(0, 3).join(" | "),
    };
  }

  const entry = imported.outcome.created[0] ?? imported.outcome.updated[0];
  if (!entry) {
    return {
      ok: false,
      error: "הריל לא נשמר.",
      hint: "Apify החזירה פריט שלא ניתן לייבא.",
    };
  }

  const existingAnalysis = await repos.analyses.latestForReel(entry.reel.id);
  if (existingAnalysis) {
    return {
      ok: true,
      reelId: entry.reel.id,
      imported: imported.outcome,
      analysis: "already-existed",
      analysisHint: null,
    };
  }

  const analysed = await runAnalysis(entry.reel.id);
  return {
    ok: true,
    reelId: entry.reel.id,
    imported: imported.outcome,
    analysis: analysed.ok ? "created" : "failed",
    analysisHint: analysed.ok ? null : `${analysed.error} ${analysed.hint}`,
  };
}
