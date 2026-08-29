import { randomUUID } from "node:crypto";

import type { Db } from "@/lib/db/client";
import type {
  Competitor,
  CompetitorInput,
  Country,
  ImportSource,
  PatternCard,
  PatternCardInput,
  Reel,
  ReelAnalysisInput,
  ReelAnalysisRecord,
  ReelComparison,
  ReelComparisonInput,
  ReelFilters,
  ReelInput,
  ReelListItem,
  ReelMedia,
  ReelMediaInput,
  ReelMetrics,
  ReelMetricsInput,
} from "@/lib/domain/types";

import type {
  AnalysisRepository,
  ComparisonRepository,
  CompetitorRepository,
  CompetitorStats,
  MediaRepository,
  MetricsRepository,
  PatternRepository,
  ReelRepository,
  Repositories,
} from "./types";

type Row = Record<string, unknown>;

const now = (): string => new Date().toISOString();
const id = (): string => randomUUID();

function parseJsonArray(value: unknown): string[] {
  if (typeof value !== "string") return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function parseJson(value: unknown): unknown {
  if (typeof value !== "string") return null;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

const str = (value: unknown): string => (typeof value === "string" ? value : "");
const nullableStr = (value: unknown): string | null => (typeof value === "string" ? value : null);
const nullableNum = (value: unknown): number | null => (typeof value === "number" ? value : null);

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

function mapCompetitor(row: Row): Competitor {
  return {
    id: str(row.id),
    displayName: str(row.display_name),
    instagramUsername: str(row.instagram_username),
    profileUrl: str(row.profile_url),
    country: str(row.country) as Country,
    niche: str(row.niche),
    relevanceNote: str(row.relevance_note),
    tags: parseJsonArray(row.tags),
    createdAt: str(row.created_at),
    updatedAt: str(row.updated_at),
  };
}

function mapReel(row: Row): Reel {
  return {
    id: str(row.id),
    competitorId: str(row.competitor_id),
    sourceUrl: str(row.source_url),
    shortCode: str(row.short_code),
    caption: nullableStr(row.caption),
    publishedAt: nullableStr(row.published_at),
    durationSeconds: nullableNum(row.duration_seconds),
    language: nullableStr(row.language),
    transcript: nullableStr(row.transcript),
    ownerUsername: nullableStr(row.owner_username),
    thumbnailUrl: nullableStr(row.thumbnail_url),
    remoteVideoUrl: nullableStr(row.remote_video_url),
    tags: parseJsonArray(row.tags),
    importSource: str(row.import_source) as ImportSource,
    importedAt: str(row.imported_at),
    rawPayload: parseJson(row.raw_payload),
    createdAt: str(row.created_at),
    updatedAt: str(row.updated_at),
  };
}

function mapMetrics(row: Row): ReelMetrics {
  return {
    id: str(row.id),
    reelId: str(row.reel_id),
    playCount: nullableNum(row.play_count),
    likesCount: nullableNum(row.likes_count),
    commentsCount: nullableNum(row.comments_count),
    capturedAt: str(row.captured_at),
    source: str(row.source),
  };
}

function mapMedia(row: Row): ReelMedia {
  return {
    id: str(row.id),
    reelId: str(row.reel_id),
    kind: str(row.kind) as ReelMedia["kind"],
    storageKey: str(row.storage_key),
    originalFilename: nullableStr(row.original_filename),
    mimeType: str(row.mime_type),
    byteSize: typeof row.byte_size === "number" ? row.byte_size : 0,
    createdAt: str(row.created_at),
  };
}

function mapAnalysis(row: Row): ReelAnalysisRecord {
  return {
    id: str(row.id),
    reelId: str(row.reel_id),
    promptVersion: str(row.prompt_version),
    transcriptRef: nullableStr(row.transcript_ref),
    language: nullableStr(row.language),
    provider: str(row.provider),
    model: nullableStr(row.model),
    runMode: str(row.run_mode) as ReelAnalysisRecord["runMode"],
    analysedAt: str(row.analysed_at),
    payload: parseJson(row.payload),
    createdAt: str(row.created_at),
  };
}

function mapComparison(row: Row): ReelComparison {
  return {
    id: str(row.id),
    reelAId: str(row.reel_a_id),
    reelBId: str(row.reel_b_id),
    comparability: parseJson(row.comparability),
    notes: nullableStr(row.notes),
    createdAt: str(row.created_at),
  };
}

function mapPattern(row: Row): PatternCard {
  return {
    id: str(row.id),
    comparisonId: nullableStr(row.comparison_id),
    title: str(row.title),
    description: str(row.description),
    whenUseful: str(row.when_useful),
    supportingReelIds: parseJsonArray(row.supporting_reel_ids),
    counterexamples: str(row.counterexamples),
    evidenceCount: typeof row.evidence_count === "number" ? row.evidence_count : 0,
    confidence: str(row.confidence) as PatternCard["confidence"],
    baderechTranslation: str(row.baderech_translation),
    doNotCopyNote: str(row.do_not_copy_note),
    createdAt: str(row.created_at),
    updatedAt: str(row.updated_at),
  };
}

class SqliteCompetitorRepository implements CompetitorRepository {
  constructor(private readonly db: Db) {}

  async list(): Promise<Competitor[]> {
    const rows = this.db
      .prepare("SELECT * FROM competitors ORDER BY display_name COLLATE NOCASE ASC")
      .all() as Row[];
    return rows.map(mapCompetitor);
  }

  async findById(competitorId: string): Promise<Competitor | null> {
    const row = this.db.prepare("SELECT * FROM competitors WHERE id = ?").get(competitorId) as
      | Row
      | undefined;
    return row ? mapCompetitor(row) : null;
  }

  async findByUsername(username: string): Promise<Competitor | null> {
    const row = this.db
      .prepare("SELECT * FROM competitors WHERE instagram_username = ? COLLATE NOCASE")
      .get(username) as Row | undefined;
    return row ? mapCompetitor(row) : null;
  }

  async create(input: CompetitorInput): Promise<Competitor> {
    const record: Competitor = { ...input, id: input.id ?? id(), createdAt: now(), updatedAt: now() };
    this.db
      .prepare(
        `INSERT INTO competitors
           (id, display_name, instagram_username, profile_url, country, niche, relevance_note, tags, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        record.id,
        record.displayName,
        record.instagramUsername,
        record.profileUrl,
        record.country,
        record.niche,
        record.relevanceNote,
        JSON.stringify(record.tags),
        record.createdAt,
        record.updatedAt,
      );
    return record;
  }

  async update(competitorId: string, input: Partial<CompetitorInput>): Promise<Competitor> {
    const existing = await this.findById(competitorId);
    if (!existing) throw new Error(`Competitor ${competitorId} not found`);
    const next: Competitor = { ...existing, ...input, updatedAt: now() };
    this.db
      .prepare(
        `UPDATE competitors SET display_name = ?, instagram_username = ?, profile_url = ?,
           country = ?, niche = ?, relevance_note = ?, tags = ?, updated_at = ? WHERE id = ?`,
      )
      .run(
        next.displayName,
        next.instagramUsername,
        next.profileUrl,
        next.country,
        next.niche,
        next.relevanceNote,
        JSON.stringify(next.tags),
        next.updatedAt,
        competitorId,
      );
    return next;
  }

  async remove(competitorId: string): Promise<void> {
    this.db.prepare("DELETE FROM competitors WHERE id = ?").run(competitorId);
  }
}

class SqliteReelRepository implements ReelRepository {
  constructor(private readonly db: Db) {}

  async list(filters: ReelFilters = {}): Promise<ReelListItem[]> {
    const clauses: string[] = [];
    const params: unknown[] = [];

    if (filters.competitorId) {
      clauses.push("r.competitor_id = ?");
      params.push(filters.competitorId);
    }
    if (filters.from) {
      clauses.push("(r.published_at IS NOT NULL AND r.published_at >= ?)");
      params.push(filters.from);
    }
    if (filters.to) {
      clauses.push("(r.published_at IS NOT NULL AND r.published_at <= ?)");
      params.push(filters.to);
    }
    if (filters.search) {
      clauses.push("(r.caption LIKE ? OR r.short_code LIKE ?)");
      params.push(`%${filters.search}%`, `%${filters.search}%`);
    }

    const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";

    const rows = this.db
      .prepare(
        `SELECT r.*,
                c.display_name        AS c_display_name,
                c.instagram_username  AS c_username,
                (SELECT id FROM reel_media m WHERE m.reel_id = r.id AND m.kind = 'video'
                  ORDER BY m.created_at DESC LIMIT 1) AS video_media_id,
                (SELECT id FROM reel_analyses a WHERE a.reel_id = r.id
                  ORDER BY a.created_at DESC LIMIT 1) AS analysis_id,
                (SELECT run_mode FROM reel_analyses a WHERE a.reel_id = r.id
                  ORDER BY a.created_at DESC LIMIT 1) AS analysis_mode
           FROM reels r
           JOIN competitors c ON c.id = r.competitor_id
           ${where}
          ORDER BY COALESCE(r.published_at, r.imported_at) DESC`,
      )
      .all(...params) as Row[];

    const items: ReelListItem[] = rows.map((row) => {
      const reel = mapReel(row);
      const analysisId = nullableStr(row.analysis_id);
      const analysisMode = nullableStr(row.analysis_mode);
      return {
        reel,
        competitor: {
          id: reel.competitorId,
          displayName: str(row.c_display_name),
          instagramUsername: str(row.c_username),
        },
        metrics: null,
        hasVideoFile: nullableStr(row.video_media_id) !== null,
        videoMediaId: nullableStr(row.video_media_id),
        analysisStatus: analysisId === null ? "none" : analysisMode === "live" ? "live" : "fixture",
        latestAnalysisId: analysisId,
      };
    });

    const metricsRepo = new SqliteMetricsRepository(this.db);
    for (const item of items) {
      item.metrics = await metricsRepo.latestForReel(item.reel.id);
    }

    let filtered = items;
    if (filters.tag) {
      filtered = filtered.filter((item) => item.reel.tags.includes(filters.tag as string));
    }
    if (filters.analysisStatus === "none") {
      filtered = filtered.filter((item) => item.analysisStatus === "none");
    } else if (filters.analysisStatus === "analysed") {
      filtered = filtered.filter((item) => item.analysisStatus !== "none");
    }

    return filtered;
  }

  async findById(reelId: string): Promise<Reel | null> {
    const row = this.db.prepare("SELECT * FROM reels WHERE id = ?").get(reelId) as Row | undefined;
    return row ? mapReel(row) : null;
  }

  async findByShortCode(competitorId: string, shortCode: string): Promise<Reel | null> {
    const row = this.db
      .prepare("SELECT * FROM reels WHERE competitor_id = ? AND short_code = ?")
      .get(competitorId, shortCode) as Row | undefined;
    return row ? mapReel(row) : null;
  }

  async create(input: ReelInput): Promise<Reel> {
    const record: Reel = { ...input, id: input.id ?? id(), createdAt: now(), updatedAt: now() };
    this.db
      .prepare(
        `INSERT INTO reels
           (id, competitor_id, source_url, short_code, caption, published_at, duration_seconds,
            language, transcript, owner_username, thumbnail_url, remote_video_url, tags,
            import_source, imported_at, raw_payload, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        record.id,
        record.competitorId,
        record.sourceUrl,
        record.shortCode,
        record.caption,
        record.publishedAt,
        record.durationSeconds,
        record.language,
        record.transcript,
        record.ownerUsername,
        record.thumbnailUrl,
        record.remoteVideoUrl,
        JSON.stringify(record.tags),
        record.importSource,
        record.importedAt,
        JSON.stringify(record.rawPayload ?? {}),
        record.createdAt,
        record.updatedAt,
      );
    return record;
  }

  async update(reelId: string, input: Partial<ReelInput>): Promise<Reel> {
    const existing = await this.findById(reelId);
    if (!existing) throw new Error(`Reel ${reelId} not found`);
    const next: Reel = { ...existing, ...input, updatedAt: now() };
    this.db
      .prepare(
        `UPDATE reels SET caption = ?, published_at = ?, duration_seconds = ?, language = ?,
           transcript = ?, thumbnail_url = ?, remote_video_url = ?, tags = ?, updated_at = ?
         WHERE id = ?`,
      )
      .run(
        next.caption,
        next.publishedAt,
        next.durationSeconds,
        next.language,
        next.transcript,
        next.thumbnailUrl,
        next.remoteVideoUrl,
        JSON.stringify(next.tags),
        next.updatedAt,
        reelId,
      );
    return next;
  }

  async remove(reelId: string): Promise<void> {
    this.db.prepare("DELETE FROM reels WHERE id = ?").run(reelId);
  }

  async statsByCompetitor(): Promise<CompetitorStats[]> {
    const competitors = this.db.prepare("SELECT id FROM competitors").all() as Row[];
    const stats: CompetitorStats[] = [];

    for (const competitorRow of competitors) {
      const competitorId = str(competitorRow.id);
      const rows = this.db
        .prepare(
          `SELECT r.id, r.published_at,
                  (SELECT play_count FROM reel_metrics m WHERE m.reel_id = r.id
                    ORDER BY m.captured_at DESC LIMIT 1) AS play_count,
                  (SELECT likes_count FROM reel_metrics m WHERE m.reel_id = r.id
                    ORDER BY m.captured_at DESC LIMIT 1) AS likes_count,
                  (SELECT COUNT(*) FROM reel_analyses a WHERE a.reel_id = r.id) AS analysis_count
             FROM reels r WHERE r.competitor_id = ?`,
        )
        .all(competitorId) as Row[];

      const playCounts = rows
        .map((row) => nullableNum(row.play_count))
        .filter((value): value is number => value !== null);
      const likeCounts = rows
        .map((row) => nullableNum(row.likes_count))
        .filter((value): value is number => value !== null);
      const dates = rows
        .map((row) => nullableStr(row.published_at))
        .filter((value): value is string => value !== null)
        .sort();

      stats.push({
        competitorId,
        importedReels: rows.length,
        analysedReels: rows.filter((row) => (nullableNum(row.analysis_count) ?? 0) > 0).length,
        reelsWithPlayCount: playCounts.length,
        medianPlayCount: median(playCounts),
        medianLikes: median(likeCounts),
        earliestPublishedAt: dates[0] ?? null,
        latestPublishedAt: dates[dates.length - 1] ?? null,
      });
    }

    return stats;
  }

  async cohortForCompetitor(
    competitorId: string,
  ): Promise<Array<{ reel: Reel; metrics: ReelMetrics | null }>> {
    const rows = this.db
      .prepare("SELECT * FROM reels WHERE competitor_id = ?")
      .all(competitorId) as Row[];
    const metricsRepo = new SqliteMetricsRepository(this.db);
    const result: Array<{ reel: Reel; metrics: ReelMetrics | null }> = [];
    for (const row of rows) {
      const reel = mapReel(row);
      result.push({ reel, metrics: await metricsRepo.latestForReel(reel.id) });
    }
    return result;
  }

  async allTags(): Promise<string[]> {
    const rows = this.db.prepare("SELECT tags FROM reels").all() as Row[];
    const set = new Set<string>();
    for (const row of rows) {
      for (const tag of parseJsonArray(row.tags)) set.add(tag);
    }
    return [...set].sort((a, b) => a.localeCompare(b, "he"));
  }
}

class SqliteMetricsRepository implements MetricsRepository {
  constructor(private readonly db: Db) {}

  async latestForReel(reelId: string): Promise<ReelMetrics | null> {
    const row = this.db
      .prepare("SELECT * FROM reel_metrics WHERE reel_id = ? ORDER BY captured_at DESC LIMIT 1")
      .get(reelId) as Row | undefined;
    return row ? mapMetrics(row) : null;
  }

  async record(input: ReelMetricsInput): Promise<ReelMetrics> {
    const record: ReelMetrics = { ...input, id: input.id ?? id() };
    this.db
      .prepare(
        `INSERT INTO reel_metrics (id, reel_id, play_count, likes_count, comments_count, captured_at, source)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        record.id,
        record.reelId,
        record.playCount,
        record.likesCount,
        record.commentsCount,
        record.capturedAt,
        record.source,
      );
    return record;
  }
}

class SqliteMediaRepository implements MediaRepository {
  constructor(private readonly db: Db) {}

  async listForReel(reelId: string): Promise<ReelMedia[]> {
    const rows = this.db
      .prepare("SELECT * FROM reel_media WHERE reel_id = ? ORDER BY created_at DESC")
      .all(reelId) as Row[];
    return rows.map(mapMedia);
  }

  async findById(mediaId: string): Promise<ReelMedia | null> {
    const row = this.db.prepare("SELECT * FROM reel_media WHERE id = ?").get(mediaId) as
      | Row
      | undefined;
    return row ? mapMedia(row) : null;
  }

  async create(input: ReelMediaInput): Promise<ReelMedia> {
    const record: ReelMedia = { ...input, id: input.id ?? id(), createdAt: now() };
    this.db
      .prepare(
        `INSERT INTO reel_media (id, reel_id, kind, storage_key, original_filename, mime_type, byte_size, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        record.id,
        record.reelId,
        record.kind,
        record.storageKey,
        record.originalFilename,
        record.mimeType,
        record.byteSize,
        record.createdAt,
      );
    return record;
  }

  async remove(mediaId: string): Promise<void> {
    this.db.prepare("DELETE FROM reel_media WHERE id = ?").run(mediaId);
  }
}

class SqliteAnalysisRepository implements AnalysisRepository {
  constructor(private readonly db: Db) {}

  async latestForReel(reelId: string): Promise<ReelAnalysisRecord | null> {
    const row = this.db
      .prepare("SELECT * FROM reel_analyses WHERE reel_id = ? ORDER BY created_at DESC LIMIT 1")
      .get(reelId) as Row | undefined;
    return row ? mapAnalysis(row) : null;
  }

  async findById(analysisId: string): Promise<ReelAnalysisRecord | null> {
    const row = this.db.prepare("SELECT * FROM reel_analyses WHERE id = ?").get(analysisId) as
      | Row
      | undefined;
    return row ? mapAnalysis(row) : null;
  }

  async create(input: ReelAnalysisInput): Promise<ReelAnalysisRecord> {
    const record: ReelAnalysisRecord = { ...input, id: input.id ?? id(), createdAt: now() };
    this.db
      .prepare(
        `INSERT INTO reel_analyses
           (id, reel_id, prompt_version, transcript_ref, language, provider, model, run_mode, analysed_at, payload, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        record.id,
        record.reelId,
        record.promptVersion,
        record.transcriptRef,
        record.language,
        record.provider,
        record.model,
        record.runMode,
        record.analysedAt,
        JSON.stringify(record.payload),
        record.createdAt,
      );
    return record;
  }
}

class SqliteComparisonRepository implements ComparisonRepository {
  constructor(private readonly db: Db) {}

  async findById(comparisonId: string): Promise<ReelComparison | null> {
    const row = this.db.prepare("SELECT * FROM reel_comparisons WHERE id = ?").get(comparisonId) as
      | Row
      | undefined;
    return row ? mapComparison(row) : null;
  }

  async create(input: ReelComparisonInput): Promise<ReelComparison> {
    const record: ReelComparison = { ...input, id: input.id ?? id(), createdAt: now() };
    this.db
      .prepare(
        `INSERT INTO reel_comparisons (id, reel_a_id, reel_b_id, comparability, notes, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(
        record.id,
        record.reelAId,
        record.reelBId,
        JSON.stringify(record.comparability),
        record.notes,
        record.createdAt,
      );
    return record;
  }

  async list(): Promise<ReelComparison[]> {
    const rows = this.db
      .prepare("SELECT * FROM reel_comparisons ORDER BY created_at DESC")
      .all() as Row[];
    return rows.map(mapComparison);
  }
}

class SqlitePatternRepository implements PatternRepository {
  constructor(private readonly db: Db) {}

  async list(): Promise<PatternCard[]> {
    const rows = this.db
      .prepare("SELECT * FROM pattern_cards ORDER BY created_at DESC")
      .all() as Row[];
    return rows.map(mapPattern);
  }

  async findById(patternId: string): Promise<PatternCard | null> {
    const row = this.db.prepare("SELECT * FROM pattern_cards WHERE id = ?").get(patternId) as
      | Row
      | undefined;
    return row ? mapPattern(row) : null;
  }

  async create(input: PatternCardInput): Promise<PatternCard> {
    const record: PatternCard = { ...input, id: input.id ?? id(), createdAt: now(), updatedAt: now() };
    this.db
      .prepare(
        `INSERT INTO pattern_cards
           (id, comparison_id, title, description, when_useful, supporting_reel_ids, counterexamples,
            evidence_count, confidence, baderech_translation, do_not_copy_note, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        record.id,
        record.comparisonId,
        record.title,
        record.description,
        record.whenUseful,
        JSON.stringify(record.supportingReelIds),
        record.counterexamples,
        record.evidenceCount,
        record.confidence,
        record.baderechTranslation,
        record.doNotCopyNote,
        record.createdAt,
        record.updatedAt,
      );
    return record;
  }

  async remove(patternId: string): Promise<void> {
    this.db.prepare("DELETE FROM pattern_cards WHERE id = ?").run(patternId);
  }
}

export function createSqliteRepositories(db: Db): Repositories {
  return {
    competitors: new SqliteCompetitorRepository(db),
    reels: new SqliteReelRepository(db),
    metrics: new SqliteMetricsRepository(db),
    media: new SqliteMediaRepository(db),
    analyses: new SqliteAnalysisRepository(db),
    comparisons: new SqliteComparisonRepository(db),
    patterns: new SqlitePatternRepository(db),
  };
}
