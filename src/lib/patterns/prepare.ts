import type { Confidence, PatternCardInput } from "@/lib/domain/types";
import { patternFormSchema, fieldErrors, type PatternFormValues } from "@/lib/validation/forms";

/**
 * Pattern Cards are the one place where a finding is allowed to become advice,
 * so they carry their own evidence with them: which reels support them, how many
 * of those reels actually have an analysis behind them, and what would count as
 * a counterexample.
 */

export type SupportingReelState = {
  reelId: string;
  exists: boolean;
  hasAnalysis: boolean;
};

/**
 * Evidence count is derived, never accepted from the form. A supporting reel
 * only counts once it has a stored analysis — a link on its own is not evidence.
 */
export function deriveEvidenceCount(states: SupportingReelState[]): number {
  return states.filter((state) => state.exists && state.hasAnalysis).length;
}

const CONFIDENCE_CEILING: Record<number, Confidence> = {
  0: "low",
  1: "low",
  2: "medium",
};

/**
 * Two reels can support a medium-confidence pattern at most. High confidence
 * needs at least three analysed reels behind it.
 */
export function capConfidence(requested: Confidence, evidenceCount: number): Confidence {
  const ceiling = CONFIDENCE_CEILING[evidenceCount] ?? "high";
  const order: Confidence[] = ["low", "medium", "high"];
  return order.indexOf(requested) <= order.indexOf(ceiling) ? requested : ceiling;
}

export type PreparePatternResult =
  | { ok: true; input: PatternCardInput; cappedFrom: Confidence | null }
  | { ok: false; errors: Record<string, string> };

export function preparePatternCard(
  raw: unknown,
  supporting: SupportingReelState[],
): PreparePatternResult {
  const parsed = patternFormSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };

  const values: PatternFormValues = parsed.data;

  const missing = supporting.filter((state) => !state.exists);
  if (missing.length > 0) {
    return {
      ok: false,
      errors: { supportingReelIds: "אחד הרילים התומכים לא קיים יותר. רעננו את הדף ובחרו מחדש." },
    };
  }

  const evidenceCount = deriveEvidenceCount(supporting);
  if (evidenceCount === 0) {
    return {
      ok: false,
      errors: {
        supportingReelIds:
          "אין ראיה: אף ריל תומך אינו מנותח. פתחו ניתוח לפחות לריל אחד לפני שמירת התבנית.",
      },
    };
  }

  const confidence = capConfidence(values.confidence, evidenceCount);

  return {
    ok: true,
    cappedFrom: confidence === values.confidence ? null : values.confidence,
    input: {
      comparisonId: values.comparisonId && values.comparisonId !== "" ? values.comparisonId : null,
      title: values.title,
      description: values.description,
      whenUseful: values.whenUseful,
      supportingReelIds: values.supportingReelIds,
      counterexamples: values.counterexamples,
      evidenceCount,
      confidence,
      baderechTranslation: values.baderechTranslation,
      doNotCopyNote: values.doNotCopyNote,
    },
  };
}
