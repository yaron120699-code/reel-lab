import type { Reel, ReelMetrics } from "@/lib/domain/types";

/**
 * Comparability, deliberately separated from comparison.
 *
 * Two reels can always be placed side by side. Whether the difference between
 * them means anything is a different question, and this module answers only
 * that question. It never produces a conclusion — it produces the reasons a
 * conclusion would be unsafe.
 */

export type CheckStatus = "match" | "mismatch" | "unknown";

export type ComparabilityCheck = {
  key: string;
  question: string;
  status: CheckStatus;
  detail: string;
};

export type ComparabilityVerdict = {
  checks: ComparabilityCheck[];
  matches: number;
  mismatches: number;
  unknowns: number;
  level: "reasonable" | "weak" | "unsafe";
  headline: string;
};

export type ComparisonSide = {
  reel: Reel;
  metrics: ReelMetrics | null;
  /** Topic string taken from the stored analysis, when one exists. */
  topic: string | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const SIMILAR_PERIOD_DAYS = 90;
const SEASONAL_CONFOUND_DAYS = 120;
const DURATION_TOLERANCE = 0.4;

function daysApart(a: string | null, b: string | null): number | null {
  if (!a || !b) return null;
  const first = new Date(a).getTime();
  const second = new Date(b).getTime();
  if (Number.isNaN(first) || Number.isNaN(second)) return null;
  return Math.abs(first - second) / DAY_MS;
}

function normaliseWords(value: string): Set<string> {
  return new Set(
    value
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter((word) => word.length > 2),
  );
}

function overlapRatio(a: string, b: string): number {
  const left = normaliseWords(a);
  const right = normaliseWords(b);
  if (left.size === 0 || right.size === 0) return 0;
  let shared = 0;
  for (const word of left) if (right.has(word)) shared += 1;
  return shared / Math.min(left.size, right.size);
}

function sameCreator(a: ComparisonSide, b: ComparisonSide): ComparabilityCheck {
  const match = a.reel.competitorId === b.reel.competitorId;
  return {
    key: "sameCreator",
    question: "אותו יוצר?",
    status: match ? "match" : "mismatch",
    detail: match
      ? "שני הרילים שייכים לאותו יוצר, כך שגודל הקהל וההפצה דומים."
      : "יוצרים שונים. הבדלי גודל קהל והפצה גדולים בדרך כלל מהבדלי מבנה.",
  };
}

function similarPeriod(a: ComparisonSide, b: ComparisonSide): ComparabilityCheck {
  const gap = daysApart(a.reel.publishedAt, b.reel.publishedAt);
  if (gap === null) {
    return {
      key: "similarPeriod",
      question: "תקופת פרסום דומה?",
      status: "unknown",
      detail: "חסר תאריך פרסום לפחות באחד הרילים.",
    };
  }
  const match = gap <= SIMILAR_PERIOD_DAYS;
  return {
    key: "similarPeriod",
    question: "תקופת פרסום דומה?",
    status: match ? "match" : "mismatch",
    detail: match
      ? `הפרש של ${Math.round(gap)} ימים.`
      : `הפרש של ${Math.round(gap)} ימים. אלגוריתם ההפצה והרגלי הצפייה השתנו בינתיים.`,
  };
}

function similarTopic(a: ComparisonSide, b: ComparisonSide): ComparabilityCheck {
  const sharedTags = a.reel.tags.filter((tag) => b.reel.tags.includes(tag));
  if (sharedTags.length > 0) {
    return {
      key: "similarTopic",
      question: "נושא דומה?",
      status: "match",
      detail: `תגיות משותפות: ${sharedTags.join(", ")}.`,
    };
  }
  if (a.topic && b.topic) {
    const ratio = overlapRatio(a.topic, b.topic);
    return {
      key: "similarTopic",
      question: "נושא דומה?",
      status: ratio >= 0.3 ? "match" : "mismatch",
      detail:
        ratio >= 0.3
          ? "הנושאים שנרשמו בניתוחים חופפים חלקית."
          : "הנושאים שנרשמו בניתוחים שונים. הפרש ביצועים עשוי לנבוע מהנושא ולא מהמבנה.",
    };
  }
  return {
    key: "similarTopic",
    question: "נושא דומה?",
    status: "unknown",
    detail: "אין תגיות משותפות ואין נושא מנותח בשני הצדדים.",
  };
}

function similarFormat(a: ComparisonSide, b: ComparisonSide): ComparabilityCheck {
  const left = a.reel.durationSeconds;
  const right = b.reel.durationSeconds;
  if (left === null || right === null) {
    return {
      key: "similarFormat",
      question: "פורמט דומה?",
      status: "unknown",
      detail: "חסר אורך סרטון לפחות באחד הרילים.",
    };
  }
  const longer = Math.max(left, right);
  const shorter = Math.min(left, right);
  const diff = longer === 0 ? 0 : (longer - shorter) / longer;
  const match = diff <= DURATION_TOLERANCE;
  return {
    key: "similarFormat",
    question: "פורמט דומה?",
    status: match ? "match" : "mismatch",
    detail: `${Math.round(left)} שניות מול ${Math.round(right)} שניות (הפרש ${Math.round(diff * 100)}%).`,
  };
}

function playCountAvailable(a: ComparisonSide, b: ComparisonSide): ComparabilityCheck {
  const both = a.metrics?.playCount != null && b.metrics?.playCount != null;
  return {
    key: "playCountAvailable",
    question: "יש ספירת צפיות לשניהם?",
    status: both ? "match" : "mismatch",
    detail: both
      ? "אפשר לחשב מדד ביצועים יחסי על בסיס צפיות."
      : "חסרה ספירת צפיות. השוואה על בסיס לייקים בלבד היא ברמת ודאות נמוכה.",
  };
}

function seasonalConfound(a: ComparisonSide, b: ComparisonSide): ComparabilityCheck {
  const gap = daysApart(a.reel.publishedAt, b.reel.publishedAt);
  if (gap === null) {
    return {
      key: "seasonalConfound",
      question: "עלול להיות מבלבל עונתי או תזמוני?",
      status: "unknown",
      detail: "בלי תאריכי פרסום אי אפשר לשלול השפעת תזמון.",
    };
  }
  const risky = gap > SEASONAL_CONFOUND_DAYS;
  return {
    key: "seasonalConfound",
    question: "עלול להיות מבלבל עונתי או תזמוני?",
    status: risky ? "mismatch" : "match",
    detail: risky
      ? `הפרש של ${Math.round(gap)} ימים — חגים, עונה או שינוי בהפצה עשויים להסביר את הפער.`
      : "הפרסומים קרובים מספיק כדי שהתזמון לא יהיה ההסבר המרכזי.",
  };
}

export function assessComparability(a: ComparisonSide, b: ComparisonSide): ComparabilityVerdict {
  const checks = [
    sameCreator(a, b),
    similarPeriod(a, b),
    similarTopic(a, b),
    similarFormat(a, b),
    playCountAvailable(a, b),
    seasonalConfound(a, b),
  ];

  const matches = checks.filter((check) => check.status === "match").length;
  const mismatches = checks.filter((check) => check.status === "mismatch").length;
  const unknowns = checks.filter((check) => check.status === "unknown").length;

  const level: ComparabilityVerdict["level"] =
    mismatches >= 3 ? "unsafe" : mismatches >= 1 || unknowns >= 3 ? "weak" : "reasonable";

  const headline =
    level === "unsafe"
      ? "הרילים אינם ברי־השוואה. קראו את ההבדלים כתיאור, לא כתוצאה."
      : level === "weak"
        ? "ההשוואה חלקית. חלק מההבדלים עשויים לנבוע מגורמים שאינם מבנה הריל."
        : "ההשוואה סבירה. עדיין אין כאן סיבתיות — רק שני מקרים זה לצד זה.";

  return { checks, matches, mismatches, unknowns, level, headline };
}

/* ------------------------------------------------------------------------- */

export type PerformanceBasis = "playCount" | "likesCount";

export type PerformanceIndex = {
  available: boolean;
  basis: PerformanceBasis | null;
  /** Reel value divided by the creator's cohort median. 1.0 = typical. */
  index: number | null;
  cohortSize: number;
  cohortMedian: number | null;
  confidence: "low" | "medium" | "high";
  note: string;
};

const MIN_COHORT = 3;

function medianOf(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

/**
 * A reel's performance relative to the same creator's other reels.
 *
 * Cross-creator absolute numbers say more about audience size than about
 * craft, so the index is always creator-relative, and it declines to produce
 * a number when the cohort is too small to mean anything.
 */
export function creatorRelativePerformance(
  target: { reel: Reel; metrics: ReelMetrics | null },
  cohort: Array<{ reel: Reel; metrics: ReelMetrics | null }>,
): PerformanceIndex {
  const siblings = cohort.filter((entry) => entry.reel.id !== target.reel.id);

  const playValues = siblings
    .map((entry) => entry.metrics?.playCount)
    .filter((value): value is number => typeof value === "number");

  if (typeof target.metrics?.playCount === "number" && playValues.length >= MIN_COHORT) {
    const cohortMedian = medianOf(playValues);
    return {
      available: true,
      basis: "playCount",
      index: cohortMedian && cohortMedian > 0 ? target.metrics.playCount / cohortMedian : null,
      cohortSize: playValues.length,
      cohortMedian,
      confidence: playValues.length >= 8 ? "high" : "medium",
      note: `יחסית לחציון הצפיות של ${playValues.length} רילים אחרים של אותו יוצר.`,
    };
  }

  const likeValues = siblings
    .map((entry) => entry.metrics?.likesCount)
    .filter((value): value is number => typeof value === "number");

  if (typeof target.metrics?.likesCount === "number" && likeValues.length >= MIN_COHORT) {
    const cohortMedian = medianOf(likeValues);
    return {
      available: true,
      basis: "likesCount",
      index: cohortMedian && cohortMedian > 0 ? target.metrics.likesCount / cohortMedian : null,
      cohortSize: likeValues.length,
      cohortMedian,
      confidence: "low",
      note: "אין ספירת צפיות, ולכן החישוב מבוסס לייקים. לייקים מושפעים מקהל קיים ולא רק מהריל עצמו — ודאות נמוכה.",
    };
  }

  return {
    available: false,
    basis: null,
    index: null,
    cohortSize: Math.max(playValues.length, likeValues.length),
    cohortMedian: null,
    confidence: "low",
    note: `צריך לפחות ${MIN_COHORT} רילים אחרים של אותו יוצר עם מדד ציבורי כדי לחשב מדד יחסי.`,
  };
}
