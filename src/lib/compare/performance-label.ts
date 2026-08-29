import type { PerformanceIndex } from "./comparability";

/**
 * Turns a creator-relative index into a label a person can scan.
 *
 * The wording is deliberately comparative, never evaluative. "חזק ביחס ליוצר"
 * says this reel outran the creator's own median; it does not say the reel is
 * good, and it certainly does not say its structure caused the numbers. Reach,
 * timing and topic all move these figures, and none of them are controlled for.
 */
export type PerformanceBand = "strong" | "typical" | "weak" | "unknown";

export const STRONG_THRESHOLD = 1.5;
export const WEAK_THRESHOLD = 0.75;

export type PerformanceLabel = {
  band: PerformanceBand;
  label: string;
  /** Always framed as a relative signal, never as a verdict. */
  caveat: string;
  index: number | null;
  basis: PerformanceIndex["basis"];
};

const LABELS: Record<PerformanceBand, string> = {
  strong: "חזק ביחס ליוצר",
  typical: "בטווח הרגיל",
  weak: "חלש ביחס ליוצר",
  unknown: "אין מספיק נתונים",
};

export function bandForIndex(index: number): PerformanceBand {
  if (index >= STRONG_THRESHOLD) return "strong";
  if (index >= WEAK_THRESHOLD) return "typical";
  return "weak";
}

export function performanceLabel(performance: PerformanceIndex): PerformanceLabel {
  if (!performance.available || performance.index === null) {
    return {
      band: "unknown",
      label: LABELS.unknown,
      caveat: performance.note,
      index: null,
      basis: null,
    };
  }

  // A likes ratio is not a reach signal. Likes come disproportionately from an
  // audience that already follows the creator, so banding on them would answer
  // a different question than the one the label appears to answer. The ratio is
  // still reported in the caveat for anyone who wants it.
  if (performance.basis === "likesCount") {
    return {
      band: "unknown",
      label: LABELS.unknown,
      caveat: `אין ספירת צפיות לריל הזה. יחס הלייקים מול חציון היוצר הוא ×${performance.index.toFixed(2)}, אך לייקים מודדים קהל קיים ולא הגעה — ודאות נמוכה מדי לסימון.`,
      index: null,
      basis: "likesCount",
    };
  }

  const band = bandForIndex(performance.index);

  return {
    band,
    label: LABELS[band],
    caveat: `יחסית לחציון הצפיות של ${performance.cohortSize} רילים אחרים של אותו יוצר. סימן יחסי בלבד — לא הוכחה שהמבנה הוא שהביא את המספרים.`,
    index: performance.index,
    basis: performance.basis,
  };
}
