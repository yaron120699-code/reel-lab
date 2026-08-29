import { z } from "zod";

/**
 * The evidence contract.
 *
 * measured — the value is present in the imported data (an Apify field, a file
 *            we hold). It must name the field it came from.
 * observed — the value is directly visible or audible in the reel or its
 *            transcript. A human or model can point at it.
 * inferred — an interpretation or hypothesis. It must carry a confidence level
 *            and must never be presented as fact.
 */
export const evidenceKindSchema = z.enum(["measured", "observed", "inferred"]);
export type EvidenceKind = z.infer<typeof evidenceKindSchema>;

export const confidenceSchema = z.enum(["low", "medium", "high"]);
export type ConfidenceLevel = z.infer<typeof confidenceSchema>;

export const EVIDENCE_KINDS: EvidenceKind[] = ["measured", "observed", "inferred"];

const evidenceBase = {
  evidence: evidenceKindSchema,
  /** Required for `measured`: the imported field or file this came from. */
  sourceField: z.string().min(1).optional(),
  /** Required for `inferred`: how strongly the interpretation is held. */
  confidence: confidenceSchema.optional(),
  /** Free-text provenance note, e.g. a transcript timestamp. */
  note: z.string().max(600).optional(),
};

type EvidenceShape = {
  evidence: EvidenceKind;
  sourceField?: string;
  confidence?: ConfidenceLevel;
  note?: string;
};

/**
 * Enforces the contract above on every field of every analysis. This is what
 * stops an inference from quietly presenting itself as a measurement.
 */
function applyEvidenceRules<T extends EvidenceShape>(value: T, ctx: z.RefinementCtx): void {
  if (value.evidence === "measured") {
    if (!value.sourceField) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["sourceField"],
        message: "A measured field must name the imported field or file it came from.",
      });
    }
    if (value.confidence) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confidence"],
        message: "A measured field carries no confidence level — it is data, not a reading.",
      });
    }
  }

  if (value.evidence === "observed") {
    if (value.confidence) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confidence"],
        message: "An observed field carries no confidence level. Mark it inferred instead.",
      });
    }
    if (value.sourceField) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["sourceField"],
        message: "An observed field has no imported source field. Use `note` for a timestamp.",
      });
    }
  }

  if (value.evidence === "inferred") {
    if (!value.confidence) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confidence"],
        message: "An inferred field must state confidence: low, medium or high.",
      });
    }
    if (value.sourceField) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["sourceField"],
        message: "An inferred field is not read from imported data. Use `note` instead.",
      });
    }
  }
}

export const findingSchema = z
  .object({ value: z.string().min(1).max(2000), ...evidenceBase })
  .superRefine(applyEvidenceRules);
export type Finding = z.infer<typeof findingSchema>;

export const listFindingSchema = z
  .object({ items: z.array(z.string().min(1).max(600)).max(20), ...evidenceBase })
  .superRefine(applyEvidenceRules);
export type ListFinding = z.infer<typeof listFindingSchema>;

export const storyBeatSchema = z.object({
  /** Human-readable position in the reel, e.g. "0:00–0:04". */
  at: z.string().min(1).max(40),
  label: z.string().min(1).max(120),
  description: z.string().min(1).max(600),
});
export type StoryBeat = z.infer<typeof storyBeatSchema>;

export const timelineFindingSchema = z
  .object({ beats: z.array(storyBeatSchema).min(1).max(24), ...evidenceBase })
  .superRefine(applyEvidenceRules);
export type TimelineFinding = z.infer<typeof timelineFindingSchema>;

/**
 * Retention is the one field with a fixed evidence kind. Public Instagram data
 * exposes no retention curve, so a competitor retention claim can only ever be
 * a hypothesis. The schema refuses to store it as anything else.
 */
export const retentionFindingSchema = listFindingSchema.superRefine((value, ctx) => {
  if (value.evidence !== "inferred") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["evidence"],
      message:
        "Retention mechanisms are always inferred. Public Instagram data contains no retention curve.",
    });
  }
});

export const ANALYSIS_PROMPT_VERSION = "reel-structure/2026-08-27.1";

export const reelAnalysisPayloadSchema = z.object({
  schemaVersion: z.literal(1),
  promptVersion: z.string().min(1),
  verbalHook: findingSchema,
  visualHook: findingSchema,
  hookMechanism: findingSchema,
  viewerPromise: findingSchema,
  openLoops: listFindingSchema,
  structureTimeline: timelineFindingSchema,
  concreteExamples: listFindingSchema,
  escalation: findingSchema,
  retentionMechanisms: retentionFindingSchema,
  payoff: findingSchema,
  closing: findingSchema,
  cta: findingSchema,
  tone: findingSchema,
  topic: findingSchema,
  language: findingSchema,
  transferableLesson: findingSchema,
  risks: listFindingSchema,
});

export type ReelAnalysisPayload = z.infer<typeof reelAnalysisPayloadSchema>;

/** Field order and Hebrew labels for the analysis view. */
export const ANALYSIS_FIELDS = [
  { key: "verbalHook", label: "הוק מילולי", kind: "finding" },
  { key: "visualHook", label: "הוק ויזואלי", kind: "finding" },
  { key: "hookMechanism", label: "מנגנון ההוק", kind: "finding" },
  { key: "viewerPromise", label: "ההבטחה לצופה", kind: "finding" },
  { key: "openLoops", label: "לולאות פתוחות", kind: "list" },
  { key: "structureTimeline", label: "ציר מבנה וביטים", kind: "timeline" },
  { key: "concreteExamples", label: "דוגמאות והוכחות", kind: "list" },
  { key: "escalation", label: "אסקלציה", kind: "finding" },
  { key: "retentionMechanisms", label: "מנגנוני שימור משוערים", kind: "list" },
  { key: "payoff", label: "פייאוף", kind: "finding" },
  { key: "closing", label: "סגירה", kind: "finding" },
  { key: "cta", label: "קריאה לפעולה", kind: "finding" },
  { key: "tone", label: "טון", kind: "finding" },
  { key: "topic", label: "נושא", kind: "finding" },
  { key: "language", label: "שפה", kind: "finding" },
  { key: "transferableLesson", label: "לקח מבני להעברה", kind: "finding" },
  { key: "risks", label: "סיכונים וחולשות", kind: "list" },
] as const satisfies ReadonlyArray<{
  key: keyof ReelAnalysisPayload;
  label: string;
  kind: "finding" | "list" | "timeline";
}>;

export type AnalysisFieldKey = (typeof ANALYSIS_FIELDS)[number]["key"];

export const EVIDENCE_LABELS: Record<EvidenceKind, string> = {
  measured: "נמדד",
  observed: "נצפה",
  inferred: "מוסק",
};

export const EVIDENCE_DESCRIPTIONS: Record<EvidenceKind, string> = {
  measured: "קיים ישירות בנתונים או בקובץ שיובאו",
  observed: "נראה או נשמע ישירות בריל",
  inferred: "פרשנות או השערה של מודל, לא עובדה",
};

export const CONFIDENCE_LABELS: Record<ConfidenceLevel, string> = {
  low: "נמוכה",
  medium: "בינונית",
  high: "גבוהה",
};

type AnyFinding = EvidenceShape;

function isEvidenceCarrier(value: unknown): value is AnyFinding {
  return (
    typeof value === "object" &&
    value !== null &&
    "evidence" in value &&
    typeof (value as { evidence: unknown }).evidence === "string"
  );
}

export type EvidenceLedger = Record<EvidenceKind, number> & { total: number };

/**
 * Counts how much of an analysis is data, how much is observation and how much
 * is interpretation. Drives the ledger bar shown above every analysis.
 */
export function buildEvidenceLedger(payload: ReelAnalysisPayload): EvidenceLedger {
  const ledger: EvidenceLedger = { measured: 0, observed: 0, inferred: 0, total: 0 };

  for (const field of ANALYSIS_FIELDS) {
    const value = payload[field.key];
    if (isEvidenceCarrier(value)) {
      ledger[value.evidence] += 1;
      ledger.total += 1;
    }
  }

  return ledger;
}

export type AnalysisParseResult =
  | { ok: true; payload: ReelAnalysisPayload }
  | { ok: false; issues: string[] };

export function parseAnalysisPayload(input: unknown): AnalysisParseResult {
  const result = reelAnalysisPayloadSchema.safeParse(input);
  if (result.success) return { ok: true, payload: result.data };
  return {
    ok: false,
    issues: result.error.issues.map(
      (issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`,
    ),
  };
}
