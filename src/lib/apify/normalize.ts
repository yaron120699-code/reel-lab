import { z } from "zod";

/**
 * Normalizes an Apify Instagram scraper result into the lab's reel shape.
 *
 * Two rules govern this module:
 *   1. A field that is absent from the source becomes `null`, never `0` and
 *      never a guess.
 *   2. Every value that survives records which source field produced it, so the
 *      analysis view can mark it as measured and name its origin.
 */

const numberish = z.union([z.number(), z.string()]).transform((value, ctx) => {
  const parsed = typeof value === "number" ? value : Number(value.replace(/[, ]/g, ""));
  if (!Number.isFinite(parsed)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Expected a number" });
    return z.NEVER;
  }
  return parsed;
});

const transcriptSegment = z.object({
  text: z.string(),
  start: z.union([z.number(), z.string()]).optional(),
});

const apifyItemSchema = z
  .object({
    url: z.string().optional(),
    shortCode: z.string().optional(),
    shortcode: z.string().optional(),
    caption: z.string().optional(),
    timestamp: z.union([z.string(), z.number()]).optional(),
    takenAtTimestamp: z.union([z.string(), z.number()]).optional(),
    videoDuration: numberish.optional(),
    duration: numberish.optional(),
    videoPlayCount: numberish.nullable().optional(),
    videoViewCount: numberish.nullable().optional(),
    playCount: numberish.nullable().optional(),
    likesCount: numberish.nullable().optional(),
    commentsCount: numberish.nullable().optional(),
    transcript: z.union([z.string(), z.array(transcriptSegment)]).nullable().optional(),
    videoUrl: z.string().nullable().optional(),
    displayUrl: z.string().nullable().optional(),
    ownerUsername: z.string().nullable().optional(),
    type: z.string().optional(),
    productType: z.string().optional(),
    hashtags: z.array(z.string()).optional(),
  })
  .passthrough();

export type ApifyItem = z.infer<typeof apifyItemSchema>;

/** Which imported field produced each value. Feeds `sourceField` on findings. */
export type MetricProvenance = {
  playCount: string | null;
  likesCount: string | null;
  commentsCount: string | null;
  durationSeconds: string | null;
  publishedAt: string | null;
  transcript: string | null;
};

export type NormalizedReel = {
  sourceUrl: string;
  shortCode: string;
  caption: string | null;
  publishedAt: string | null;
  durationSeconds: number | null;
  playCount: number | null;
  likesCount: number | null;
  commentsCount: number | null;
  transcript: string | null;
  remoteVideoUrl: string | null;
  thumbnailUrl: string | null;
  ownerUsername: string | null;
  tags: string[];
  provenance: MetricProvenance;
  /** Non-fatal notes about what was missing, shown to the importer. */
  warnings: string[];
  raw: unknown;
};

export type NormalizeResult =
  | { ok: true; reels: NormalizedReel[]; skipped: SkippedItem[] }
  | { ok: false; error: string; issues: string[] };

export type SkippedItem = { index: number; reason: string };

const SHORTCODE_PATTERN = /instagram\.com\/(?:reel|reels|p|tv)\/([A-Za-z0-9_-]+)/i;

function extractShortCode(item: ApifyItem): string | null {
  const direct = item.shortCode ?? item.shortcode;
  if (typeof direct === "string" && direct.trim() !== "") return direct.trim();
  if (typeof item.url === "string") {
    const match = SHORTCODE_PATTERN.exec(item.url);
    if (match) return match[1];
  }
  return null;
}

function toIsoDate(value: string | number | undefined): string | null {
  if (value === undefined || value === null || value === "") return null;

  if (typeof value === "number") {
    // Apify emits `takenAtTimestamp` in seconds and some actors use milliseconds.
    const ms = value > 1e12 ? value : value * 1000;
    const date = new Date(ms);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  const numeric = Number(value);
  if (Number.isFinite(numeric) && !value.includes("-") && !value.includes(":")) {
    return toIsoDate(numeric);
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function firstPresent<T>(
  candidates: ReadonlyArray<readonly [string, T | null | undefined]>,
): { value: T | null; field: string | null } {
  for (const [field, value] of candidates) {
    if (value !== undefined && value !== null) return { value, field };
  }
  return { value: null, field: null };
}

function normalizeTranscript(
  raw: string | Array<{ text: string }> | null | undefined,
): string | null {
  if (raw === undefined || raw === null) return null;
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    return trimmed === "" ? null : trimmed;
  }
  const joined = raw
    .map((segment) => segment.text.trim())
    .filter((text) => text !== "")
    .join(" ");
  return joined === "" ? null : joined;
}

function nonEmpty(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

/** Accepts a bare item, an array of items, or an Apify dataset envelope. */
export function extractApifyItems(input: unknown): unknown[] {
  if (Array.isArray(input)) return input;
  if (typeof input === "object" && input !== null) {
    const envelope = input as { items?: unknown; data?: unknown; results?: unknown };
    for (const candidate of [envelope.items, envelope.data, envelope.results]) {
      if (Array.isArray(candidate)) return candidate;
    }
    return [input];
  }
  return [];
}

export function normalizeApifyItem(rawItem: unknown, index: number): NormalizedReel | SkippedItem {
  const parsed = apifyItemSchema.safeParse(rawItem);
  if (!parsed.success) {
    return { index, reason: parsed.error.issues[0]?.message ?? "Unrecognised item shape" };
  }

  const item = parsed.data;
  const shortCode = extractShortCode(item);
  if (!shortCode) {
    return { index, reason: "No shortCode and no recognisable Instagram URL." };
  }

  const sourceUrl = nonEmpty(item.url) ?? `https://www.instagram.com/reel/${shortCode}/`;
  const warnings: string[] = [];

  const play = firstPresent<number>([
    ["videoPlayCount", item.videoPlayCount],
    ["videoViewCount", item.videoViewCount],
    ["playCount", item.playCount],
  ]);
  const likes = firstPresent<number>([["likesCount", item.likesCount]]);
  const comments = firstPresent<number>([["commentsCount", item.commentsCount]]);
  const duration = firstPresent<number>([
    ["videoDuration", item.videoDuration],
    ["duration", item.duration],
  ]);
  const published = firstPresent<string | number>([
    ["timestamp", item.timestamp],
    ["takenAtTimestamp", item.takenAtTimestamp],
  ]);

  const publishedAt = toIsoDate(published.value ?? undefined);
  const transcript = normalizeTranscript(item.transcript);

  if (play.value === null) {
    warnings.push("אין ספירת צפיות בייבוא. אל תשוו ריל זה לריל אחר לפי צפיות.");
  }
  if (publishedAt === null) {
    warnings.push("אין תאריך פרסום. בדיקת ההשוואתיות תסמן חלון זמן לא ידוע.");
  }
  if (transcript === null) {
    warnings.push("אין תמלול בייבוא. ניתוח יסתמך על הצפייה בלבד.");
  }
  if (duration.value === null) {
    warnings.push("אין אורך סרטון בייבוא.");
  }

  const tags = Array.isArray(item.hashtags)
    ? item.hashtags.map((tag) => tag.replace(/^#/, "").trim()).filter((tag) => tag !== "")
    : [];

  return {
    sourceUrl,
    shortCode,
    caption: nonEmpty(item.caption),
    publishedAt,
    durationSeconds: duration.value,
    playCount: play.value,
    likesCount: likes.value,
    commentsCount: comments.value,
    transcript,
    remoteVideoUrl: nonEmpty(item.videoUrl),
    thumbnailUrl: nonEmpty(item.displayUrl),
    ownerUsername: nonEmpty(item.ownerUsername),
    tags,
    provenance: {
      playCount: play.field,
      likesCount: likes.field,
      commentsCount: comments.field,
      durationSeconds: duration.field,
      publishedAt: published.field,
      transcript: transcript === null ? null : "transcript",
    },
    warnings,
    raw: rawItem,
  };
}

function isSkipped(value: NormalizedReel | SkippedItem): value is SkippedItem {
  return "reason" in value;
}

export function normalizeApifyPayload(input: unknown): NormalizeResult {
  const items = extractApifyItems(input);

  if (items.length === 0) {
    return {
      ok: false,
      error: "לא נמצאו פריטים ב-JSON.",
      issues: ["Expected an Apify item, an array of items, or an object with an `items` array."],
    };
  }

  const reels: NormalizedReel[] = [];
  const skipped: SkippedItem[] = [];

  items.forEach((item, index) => {
    const result = normalizeApifyItem(item, index);
    if (isSkipped(result)) skipped.push(result);
    else reels.push(result);
  });

  if (reels.length === 0) {
    return {
      ok: false,
      error: "אף פריט ב-JSON לא כלל shortCode או כתובת אינסטגרם תקפה.",
      issues: skipped.map((entry) => `item ${entry.index}: ${entry.reason}`),
    };
  }

  return { ok: true, reels, skipped };
}

/** Parses raw pasted text, then normalizes it. */
export function normalizeApifyText(text: string): NormalizeResult {
  const trimmed = text.trim();
  if (trimmed === "") {
    return { ok: false, error: "לא הודבק JSON.", issues: [] };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch (error) {
    return {
      ok: false,
      error: "ה-JSON אינו תקין. הדביקו את תוצאת ה-Apify במלואה, כולל הסוגריים החיצוניים.",
      issues: [error instanceof Error ? error.message : String(error)],
    };
  }

  return normalizeApifyPayload(parsed);
}
