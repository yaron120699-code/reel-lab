import { z } from "zod";

export const COUNTRY_LABELS = {
  IL: "ישראל",
  US: "ארצות הברית",
  OTHER: "אחר",
} as const;

const tagList = z
  .string()
  .optional()
  .transform((value) =>
    (value ?? "")
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag !== ""),
  );

export const competitorFormSchema = z.object({
  displayName: z.string().trim().min(1, "צריך שם תצוגה."),
  instagramUsername: z
    .string()
    .trim()
    .min(1, "צריך שם משתמש באינסטגרם.")
    .transform((value) => value.replace(/^@/, ""))
    .refine((value) => /^[A-Za-z0-9._]+$/.test(value), "שם משתמש יכול להכיל אותיות, ספרות, נקודה וקו תחתון."),
  profileUrl: z.string().trim().url("כתובת הפרופיל צריכה להיות URL מלא, כולל https://"),
  country: z.enum(["IL", "US", "OTHER"]),
  niche: z.string().trim().min(1, "צריך נישה."),
  relevanceNote: z.string().trim().min(1, "כתבו למה היוצר הזה רלוונטי לבדרך."),
  tags: tagList,
});

export type CompetitorFormValues = z.infer<typeof competitorFormSchema>;

export const importFormSchema = z.object({
  competitorId: z.string().trim().min(1, "בחרו יוצר."),
  json: z.string().trim().min(1, "הדביקו את תוצאת ה-Apify."),
  tags: tagList,
});

export const patternFormSchema = z.object({
  comparisonId: z.string().trim().optional(),
  title: z.string().trim().min(1, "צריך כותרת לתבנית."),
  description: z.string().trim().min(1, "תארו את התבנית."),
  whenUseful: z.string().trim().min(1, "מתי התבנית שימושית?"),
  supportingReelIds: z.array(z.string().trim().min(1)).min(1, "צריך לפחות ריל תומך אחד."),
  counterexamples: z.string().trim().min(1, "כתבו מה סותר או מה עדיין לא ידוע."),
  confidence: z.enum(["low", "medium", "high"]),
  baderechTranslation: z.string().trim().min(1, "כתבו את התרגום לבדרך."),
  doNotCopyNote: z.string().trim().min(1, "כתבו מה אסור להעתיק."),
});

export type PatternFormValues = z.infer<typeof patternFormSchema>;

/** Turns a Zod error into `{ field: message }` for inline form errors. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    if (!(key in result)) result[key] = issue.message;
  }
  return result;
}
