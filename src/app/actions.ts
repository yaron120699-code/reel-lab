"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { fetchApifyDatasetItems } from "@/lib/apify/client";
import { getRepositories } from "@/lib/repositories";
import { runAnalysis } from "@/lib/services/analysis";
import { buildComparison, saveComparison } from "@/lib/services/comparison";
import { seedDemoData } from "@/lib/services/demo";
import { attachVideoFile, importApifyJson } from "@/lib/services/import";
import { ingestInstagramReel } from "@/lib/services/intake";
import { createPatternCard } from "@/lib/services/patterns";
import type { ActionState } from "@/lib/action-state";
import {
  competitorFormSchema,
  fieldErrors,
  importFormSchema,
  reelUrlImportFormSchema,
} from "@/lib/validation/forms";


function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

/* ------------------------------- competitors ------------------------------ */

export async function createCompetitorAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = competitorFormSchema.safeParse({
    displayName: text(formData, "displayName"),
    instagramUsername: text(formData, "instagramUsername"),
    profileUrl: text(formData, "profileUrl"),
    country: text(formData, "country"),
    niche: text(formData, "niche"),
    relevanceNote: text(formData, "relevanceNote"),
    tags: text(formData, "tags"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "יש שדות שצריך לתקן.",
      errors: fieldErrors(parsed.error),
    };
  }

  const repos = getRepositories();
  const existing = await repos.competitors.findByUsername(parsed.data.instagramUsername);
  if (existing) {
    return {
      status: "error",
      message: "היוצר הזה כבר במעבדה.",
      detail: `${existing.displayName} נוסף כבר עם שם המשתמש הזה.`,
      errors: { instagramUsername: "שם המשתמש כבר קיים." },
    };
  }

  const competitor = await repos.competitors.create(parsed.data);
  revalidatePath("/competitors");
  revalidatePath("/reels");

  return {
    status: "ok",
    message: `${competitor.displayName} נוסף.`,
    detail: "אפשר לייבא לו רילים מעמוד הייבוא.",
  };
}

export async function deleteCompetitorAction(formData: FormData): Promise<void> {
  const id = text(formData, "competitorId");
  if (id === "") return;
  await getRepositories().competitors.remove(id);
  revalidatePath("/competitors");
  revalidatePath("/reels");
}

/* --------------------------------- import -------------------------------- */

export async function importReelUrlAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = reelUrlImportFormSchema.safeParse({ url: text(formData, "url") });
  if (!parsed.success) {
    return {
      status: "error",
      message: "צריך קישור תקין לריל.",
      errors: fieldErrors(parsed.error),
    };
  }

  const result = await ingestInstagramReel(parsed.data.url);
  if (!result.ok) {
    return { status: "error", message: result.error, detail: result.hint };
  }

  revalidatePath("/reels");
  revalidatePath("/competitors");
  revalidatePath(`/reels/${result.reelId}`);

  if (result.analysis !== "failed") redirect(`/reels/${result.reelId}`);

  return {
    status: "ok",
    message: "הריל יובא, אבל הניתוח האוטומטי נכשל.",
    detail: `${result.analysisHint ?? ""} הריל נשמר ואפשר לנסות לנתח אותו ידנית מהספרייה.`,
  };
}

export async function importApifyAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = importFormSchema.safeParse({
    competitorId: text(formData, "competitorId"),
    json: text(formData, "json"),
    tags: text(formData, "tags"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "יש שדות שצריך לתקן.",
      errors: fieldErrors(parsed.error),
    };
  }

  const result = await importApifyJson({
    competitorId: parsed.data.competitorId,
    json: parsed.data.json,
    tags: parsed.data.tags,
  });

  if (!result.ok) {
    return { status: "error", message: result.error, detail: result.issues.slice(0, 3).join(" | ") };
  }

  const { created, updated, skipped } = result.outcome;
  const warnings = [...created, ...updated].flatMap((entry) => entry.warnings);
  const uniqueWarnings = [...new Set(warnings)];

  revalidatePath("/reels");
  revalidatePath("/competitors");

  return {
    status: "ok",
    message: `נוספו ${created.length} רילים, עודכנו ${updated.length}.`,
    detail: [
      skipped.length > 0 ? `${skipped.length} פריטים דולגו כי לא זוהתה בהם כתובת ריל.` : null,
      ...uniqueWarnings,
    ]
      .filter((line): line is string => line !== null)
      .join(" "),
  };
}

export async function fetchApifyDatasetAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const competitorId = text(formData, "competitorId");
  const datasetId = text(formData, "datasetId");

  if (competitorId === "") {
    return { status: "error", message: "בחרו יוצר.", errors: { competitorId: "שדה חובה." } };
  }

  const fetched = await fetchApifyDatasetItems(datasetId);
  if (!fetched.ok) {
    return { status: "error", message: fetched.error, detail: fetched.hint };
  }

  const result = await importApifyJson({
    competitorId,
    json: JSON.stringify(fetched.items),
    tags: [],
    importSource: "apify-api",
  });

  if (!result.ok) {
    return { status: "error", message: result.error, detail: result.issues.slice(0, 3).join(" | ") };
  }

  revalidatePath("/reels");
  revalidatePath("/competitors");

  return {
    status: "ok",
    message: `נוספו ${result.outcome.created.length} רילים, עודכנו ${result.outcome.updated.length}.`,
  };
}

export async function attachVideoAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const reelId = text(formData, "reelId");
  if (reelId === "") {
    return { status: "error", message: "בחרו ריל.", errors: { reelId: "שדה חובה." } };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", message: "בחרו קובץ MP4.", errors: { file: "שדה חובה." } };
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const result = await attachVideoFile({
    reelId,
    filename: file.name,
    mimeType: file.type || "video/mp4",
    bytes,
  });

  if (!result.ok) return { status: "error", message: result.error };

  revalidatePath("/reels");
  revalidatePath(`/reels/${reelId}`);

  return {
    status: "ok",
    message: "הקובץ צורף לריל.",
    detail: "הקובץ נשמר מקומית בלבד ואינו נכנס ל-git.",
  };
}

/* -------------------------------- analysis -------------------------------- */

export async function runAnalysisAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const reelId = text(formData, "reelId");
  if (reelId === "") return { status: "error", message: "חסר מזהה ריל." };

  const outcome = await runAnalysis(reelId);
  revalidatePath(`/reels/${reelId}`);
  revalidatePath("/reels");

  if (!outcome.ok) {
    return { status: "error", message: outcome.error, detail: outcome.hint };
  }

  return {
    status: "ok",
    message:
      outcome.analysis.record.runMode === "fixture"
        ? "נטען ניתוח דוגמה. זהו פיקסצ׳ר מסומן, לא הרצה של מודל."
        : "הניתוח הושלם ונשמר.",
  };
}

/* ------------------------------- comparison ------------------------------- */

export async function saveComparisonAction(formData: FormData): Promise<void> {
  const reelAId = text(formData, "reelAId");
  const reelBId = text(formData, "reelBId");
  const notes = text(formData, "notes");

  const built = await buildComparison(reelAId, reelBId);
  if (!built.ok) return;

  const comparison = await saveComparison(built.view, notes === "" ? null : notes);
  revalidatePath("/patterns");
  redirect(`/compare?a=${reelAId}&b=${reelBId}&saved=${comparison.id}`);
}

/* -------------------------------- patterns -------------------------------- */

export async function savePatternAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supportingReelIds = formData
    .getAll("supportingReelIds")
    .filter((value): value is string => typeof value === "string" && value !== "");

  const result = await createPatternCard(getRepositories(), {
    comparisonId: text(formData, "comparisonId"),
    title: text(formData, "title"),
    description: text(formData, "description"),
    whenUseful: text(formData, "whenUseful"),
    supportingReelIds,
    counterexamples: text(formData, "counterexamples"),
    confidence: text(formData, "confidence"),
    baderechTranslation: text(formData, "baderechTranslation"),
    doNotCopyNote: text(formData, "doNotCopyNote"),
  });

  if (!result.ok) {
    return { status: "error", message: "התבנית לא נשמרה.", errors: result.errors };
  }

  revalidatePath("/patterns");

  return {
    status: "ok",
    message: "התבנית נשמרה בספריית התבניות.",
    detail:
      result.cappedFrom !== null
        ? `הוודאות הורדה כי יש ${result.card.evidenceCount} רילים מנותחים תומכים בלבד.`
        : `נשמרה עם ${result.card.evidenceCount} רילים מנותחים תומכים.`,
  };
}

export async function deletePatternAction(formData: FormData): Promise<void> {
  const id = text(formData, "patternId");
  if (id === "") return;
  await getRepositories().patterns.remove(id);
  revalidatePath("/patterns");
}

/* ---------------------------------- demo ---------------------------------- */

export async function seedDemoAction(_prev: ActionState): Promise<ActionState> {
  const result = await seedDemoData();

  revalidatePath("/competitors");
  revalidatePath("/reels");

  if (!result.ok) return { status: "error", message: result.error };

  const { createdReels, attachedVideos, videoNote, alreadySeeded } =
    result.result;

  const updatedReels = 0;
  const analysedReels = 0;

  return {
    status: "ok",
    message: alreadySeeded
      ? "נתוני הדמו רועננו."
      : `נטענו ${createdReels} רילים, ${analysedReels} ניתוחי דוגמה, ${attachedVideos} קובצי וידאו.`,
    detail:
      videoNote ??
      (updatedReels > 0 ? `${updatedReels} רילים קיימים עודכנו במדידה חדשה.` : undefined),
  };
}
