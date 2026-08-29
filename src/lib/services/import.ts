import "@/lib/server-only";

import { getRepositories } from "@/lib/repositories";
import { getMediaStorage } from "@/lib/storage";
import { normalizeApifyText, type NormalizedReel } from "@/lib/apify/normalize";
import type { ImportSource, Reel } from "@/lib/domain/types";

export type ImportOutcome = {
  created: Array<{ reel: Reel; warnings: string[] }>;
  updated: Array<{ reel: Reel; warnings: string[] }>;
  skipped: Array<{ index: number; reason: string }>;
};

export type ImportFailure = { ok: false; error: string; issues: string[] };
export type ImportSuccess = { ok: true; outcome: ImportOutcome };

async function persistReel(
  competitorId: string,
  normalized: NormalizedReel,
  extraTags: string[],
  importSource: ImportSource,
): Promise<{ reel: Reel; isNew: boolean }> {
  const repos = getRepositories();
  const existing = await repos.reels.findByShortCode(competitorId, normalized.shortCode);
  const tags = [...new Set([...normalized.tags, ...extraTags])];
  const capturedAt = new Date().toISOString();

  let reel: Reel;
  let isNew: boolean;

  if (existing) {
    // Re-importing refreshes content and adds a new metrics capture. The
    // original import provenance is left untouched.
    reel = await repos.reels.update(existing.id, {
      caption: normalized.caption ?? existing.caption,
      publishedAt: normalized.publishedAt ?? existing.publishedAt,
      durationSeconds: normalized.durationSeconds ?? existing.durationSeconds,
      transcript: normalized.transcript ?? existing.transcript,
      thumbnailUrl: normalized.thumbnailUrl ?? existing.thumbnailUrl,
      remoteVideoUrl: normalized.remoteVideoUrl ?? existing.remoteVideoUrl,
      tags: [...new Set([...existing.tags, ...tags])],
    });
    isNew = false;
  } else {
    reel = await repos.reels.create({
      competitorId,
      sourceUrl: normalized.sourceUrl,
      shortCode: normalized.shortCode,
      caption: normalized.caption,
      publishedAt: normalized.publishedAt,
      durationSeconds: normalized.durationSeconds,
      language: null,
      transcript: normalized.transcript,
      ownerUsername: normalized.ownerUsername,
      thumbnailUrl: normalized.thumbnailUrl,
      remoteVideoUrl: normalized.remoteVideoUrl,
      tags,
      importSource,
      importedAt: capturedAt,
      rawPayload: normalized.raw,
    });
    isNew = true;
  }

  // Metrics are recorded even when every value is null: knowing that a capture
  // happened and found nothing is different from never having looked.
  await repos.metrics.record({
    reelId: reel.id,
    playCount: normalized.playCount,
    likesCount: normalized.likesCount,
    commentsCount: normalized.commentsCount,
    capturedAt,
    source: importSource,
  });

  return { reel, isNew };
}

export async function importApifyJson(params: {
  competitorId: string;
  json: string;
  tags?: string[];
  importSource?: ImportSource;
}): Promise<ImportSuccess | ImportFailure> {
  const repos = getRepositories();
  const competitor = await repos.competitors.findById(params.competitorId);
  if (!competitor) {
    return { ok: false, error: "היוצר לא נמצא. בחרו יוצר קיים.", issues: [] };
  }

  const normalized = normalizeApifyText(params.json);
  if (!normalized.ok) return normalized;

  const outcome: ImportOutcome = { created: [], updated: [], skipped: normalized.skipped };

  for (const item of normalized.reels) {
    const { reel, isNew } = await persistReel(
      params.competitorId,
      item,
      params.tags ?? [],
      params.importSource ?? "apify-json-manual",
    );
    const entry = { reel, warnings: item.warnings };
    if (isNew) outcome.created.push(entry);
    else outcome.updated.push(entry);
  }

  return { ok: true, outcome };
}

const MAX_VIDEO_BYTES = 200 * 1024 * 1024;
const ALLOWED_VIDEO_TYPES = new Set(["video/mp4", "video/quicktime", "application/octet-stream"]);

export async function attachVideoFile(params: {
  reelId: string;
  filename: string;
  mimeType: string;
  bytes: Buffer;
}): Promise<{ ok: true; mediaId: string } | { ok: false; error: string }> {
  const repos = getRepositories();
  const reel = await repos.reels.findById(params.reelId);
  if (!reel) return { ok: false, error: "הריל לא נמצא." };

  if (params.bytes.byteLength === 0) {
    return { ok: false, error: "הקובץ ריק. בחרו קובץ MP4 תקין." };
  }
  if (params.bytes.byteLength > MAX_VIDEO_BYTES) {
    return { ok: false, error: "הקובץ גדול מ-200MB. חתכו אותו או הקטינו את הרזולוציה." };
  }
  if (!ALLOWED_VIDEO_TYPES.has(params.mimeType) && !/\.(mp4|mov|m4v)$/i.test(params.filename)) {
    return { ok: false, error: "אפשר לצרף MP4 או MOV בלבד." };
  }

  const storage = getMediaStorage();
  const saved = await storage.save({
    reelId: reel.id,
    filename: params.filename,
    bytes: params.bytes,
  });

  const media = await repos.media.create({
    reelId: reel.id,
    kind: "video",
    storageKey: saved.storageKey,
    originalFilename: params.filename,
    mimeType: params.mimeType === "application/octet-stream" ? "video/mp4" : params.mimeType,
    byteSize: saved.byteSize,
  });

  return { ok: true, mediaId: media.id };
}
