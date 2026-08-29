import { randomUUID } from "node:crypto";

import { ensurePostgresSchema, type PostgresDb } from "@/lib/db/postgres";
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
const str = (value: unknown): string => (typeof value === "string" ? value : "");
const nullableStr = (value: unknown): string | null => (typeof value === "string" ? value : null);
const nullableNum = (value: unknown): number | null => {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

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
    byteSize: nullableNum(row.byte_size) ?? 0,
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
    evidenceCount: nullableNum(row.evidence_count) ?? 0,
    confidence: str(row.confidence) as PatternCard["confidence"],
    baderechTranslation: str(row.baderech_translation),
    doNotCopyNote: str(row.do_not_copy_note),
    createdAt: str(row.created_at),
    updatedAt: str(row.updated_at),
  };
}

abstract class PostgresRepository {
  constructor(protected readonly db: PostgresDb) {}

  protected async ready(): Promise<void> {
    await ensurePostgresSchema(this.db);
  }
}

class PostgresCompetitorRepository extends PostgresRepository implements CompetitorRepository {
  async list(): Promise<Competitor[]> {
    await this.ready();
    const rows = await this.db`SELECT * FROM competitors ORDER BY LOWER(display_name) ASC`;
    return (rows as unknown as Row[]).map(mapCompetitor);
  }

  async findById(competitorId: string): Promise<Competitor | null> {
    await this.ready();
    const rows = await this.db`SELECT * FROM competitors WHERE id = ${competitorId} LIMIT 1`;
    return rows[0] ? mapCompetitor(rows[0] as Row) : null;
  }

  async findByUsername(username: string): Promise<Competitor | null> {
    await this.ready();
    const rows = await this.db`
      SELECT * FROM competitors WHERE LOWER(instagram_username) = LOWER(${username}) LIMIT 1
    `;
    return rows[0] ? mapCompetitor(rows[0] as Row) : null;
  }

  async create(input: CompetitorInput): Promise<Competitor> {
    await this.ready();
    const record: Competitor = { ...input, id: input.id ?? id(), createdAt: now(), updatedAt: now() };
    await this.db`
      INSERT INTO competitors
        (id, display_name, instagram_username, profile_url, country, niche, relevance_note, tags, created_at, updated_at)
      VALUES
        (${record.id}, ${record.displayName}, ${record.instagramUsername}, ${record.profileUrl},
         ${record.country}, ${record.niche}, ${record.relevanceNote}, ${JSON.stringify(record.tags)},
         ${record.createdAt}, ${record.updatedAt})
    `;
    return record;
  }

  async update(competitorId: string, input: Partial<CompetitorInput>): Promise<Competitor> {
    const existing = await this.findById(competitorId);
    if (!existing) throw new Error(`Competitor ${competitorId} not found`);
    const next: Competitor = { ...existing, ...input, updatedAt: now() };
    await this.db`
      UPDATE competitors SET
        display_name = ${next.displayName}, instagram_username = ${next.instagramUsername},
        profile_url = ${next.profileUrl}, country = ${next.country}, niche = ${next.niche},
        relevance_note = ${next.relevanceNote}, tags = ${JSON.stringify(next.tags)},
        updated_at = ${next.updatedAt}
      WHERE id = ${competitorId}
    `;
    return next;
  }

  async remove(competitorId: string): Promise<void> {
    await this.ready();
    await this.db`DELETE FROM competitors WHERE id = ${competitorId}`;
  }
}

class PostgresMetricsRepository extends PostgresRepository implements MetricsRepository {
  async latestForReel(reelId: string): Promise<ReelMetrics | null> {
    await this.ready();
    const rows = await this.db`
      SELECT * FROM reel_metrics WHERE reel_id = ${reelId} ORDER BY captured_at DESC LIMIT 1
    `;
    return rows[0] ? mapMetrics(rows[0] as Row) : null;
  }

  async record(input: ReelMetricsInput): Promise<ReelMetrics> {
    await this.ready();
    const record: ReelMetrics = { ...input, id: input.id ?? id() };
    await this.db`
      INSERT INTO reel_metrics
        (id, reel_id, play_count, likes_count, comments_count, captured_at, source)
      VALUES
        (${record.id}, ${record.reelId}, ${record.playCount}, ${record.likesCount},
         ${record.commentsCount}, ${record.capturedAt}, ${record.source})
    `;
    return record;
  }
}

class PostgresReelRepository extends PostgresRepository implements ReelRepository {
  async list(filters: ReelFilters = {}): Promise<ReelListItem[]> {
    await this.ready();
    const clauses: string[] = [];
    const params: string[] = [];
    const add = (clause: (positions: number[]) => string, values: string[]): void => {
      const positions = values.map((value) => {
        params.push(value);
        return params.length;
      });
      clauses.push(clause(positions));
    };

    if (filters.competitorId) add(([p]) => `r.competitor_id = $${p}`, [filters.competitorId]);
    if (filters.from) add(([p]) => `(r.published_at IS NOT NULL AND r.published_at >= $${p})`, [filters.from]);
    if (filters.to) add(([p]) => `(r.published_at IS NOT NULL AND r.published_at <= $${p})`, [filters.to]);
    if (filters.search) {
      add(([a, b]) => `(r.caption ILIKE $${a} OR r.short_code ILIKE $${b})`, [
        `%${filters.search}%`,
        `%${filters.search}%`,
      ]);
    }

    const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
    const rows = await this.db.unsafe(
      `SELECT r.*,
              c.display_name AS c_display_name,
              c.instagram_username AS c_username,
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
      params,
    );

    const metricsRepo = new PostgresMetricsRepository(this.db);
    const items: ReelListItem[] = [];
    for (const raw of rows as unknown as Row[]) {
      const reel = mapReel(raw);
      const analysisId = nullableStr(raw.analysis_id);
      const analysisMode = nullableStr(raw.analysis_mode);
      items.push({
        reel,
        competitor: {
          id: reel.competitorId,
          displayName: str(raw.c_display_name),
          instagramUsername: str(raw.c_username),
        },
        metrics: await metricsRepo.latestForReel(reel.id),
        hasVideoFile: nullableStr(raw.video_media_id) !== null,
        videoMediaId: nullableStr(raw.video_media_id),
        analysisStatus: analysisId === null ? "none" : analysisMode === "live" ? "live" : "fixture",
        latestAnalysisId: analysisId,
      });
    }

    let filtered = items;
    if (filters.tag) filtered = filtered.filter((item) => item.reel.tags.includes(filters.tag as string));
    if (filters.analysisStatus === "none") {
      filtered = filtered.filter((item) => item.analysisStatus === "none");
    } else if (filters.analysisStatus === "analysed") {
      filtered = filtered.filter((item) => item.analysisStatus !== "none");
    }
    return filtered;
  }

  async findById(reelId: string): Promise<Reel | null> {
    await this.ready();
    const rows = await this.db`SELECT * FROM reels WHERE id = ${reelId} LIMIT 1`;
    return rows[0] ? mapReel(rows[0] as Row) : null;
  }

  async findByShortCode(competitorId: string, shortCode: string): Promise<Reel | null> {
    await this.ready();
    const rows = await this.db`
      SELECT * FROM reels WHERE competitor_id = ${competitorId} AND short_code = ${shortCode} LIMIT 1
    `;
    return rows[0] ? mapReel(rows[0] as Row) : null;
  }

  async create(input: ReelInput): Promise<Reel> {
    await this.ready();
    const record: Reel = { ...input, id: input.id ?? id(), createdAt: now(), updatedAt: now() };
    await this.db`
      INSERT INTO reels
        (id, competitor_id, source_url, short_code, caption, published_at, duration_seconds,
         language, transcript, owner_username, thumbnail_url, remote_video_url, tags,
         import_source, imported_at, raw_payload, created_at, updated_at)
      VALUES
        (${record.id}, ${record.competitorId}, ${record.sourceUrl}, ${record.shortCode},
         ${record.caption}, ${record.publishedAt}, ${record.durationSeconds}, ${record.language},
         ${record.transcript}, ${record.ownerUsername}, ${record.thumbnailUrl}, ${record.remoteVideoUrl},
         ${JSON.stringify(record.tags)}, ${record.importSource}, ${record.importedAt},
         ${JSON.stringify(record.rawPayload ?? {})}, ${record.createdAt}, ${record.updatedAt})
    `;
    return record;
  }

  async update(reelId: string, input: Partial<ReelInput>): Promise<Reel> {
    const existing = await this.findById(reelId);
    if (!existing) throw new Error(`Reel ${reelId} not found`);
    const next: Reel = { ...existing, ...input, updatedAt: now() };
    await this.db`
      UPDATE reels SET
        caption = ${next.caption}, published_at = ${next.publishedAt},
        duration_seconds = ${next.durationSeconds}, language = ${next.language},
        transcript = ${next.transcript}, thumbnail_url = ${next.thumbnailUrl},
        remote_video_url = ${next.remoteVideoUrl}, tags = ${JSON.stringify(next.tags)},
        updated_at = ${next.updatedAt}
      WHERE id = ${reelId}
    `;
    return next;
  }

  async remove(reelId: string): Promise<void> {
    await this.ready();
    await this.db`DELETE FROM reels WHERE id = ${reelId}`;
  }

  async statsByCompetitor(): Promise<CompetitorStats[]> {
    await this.ready();
    const competitors = await this.db`SELECT id FROM competitors`;
    const stats: CompetitorStats[] = [];
    for (const competitorRow of competitors as unknown as Row[]) {
      const competitorId = str(competitorRow.id);
      const rows = await this.db`
        SELECT r.id, r.published_at,
               (SELECT play_count FROM reel_metrics m WHERE m.reel_id = r.id
                 ORDER BY m.captured_at DESC LIMIT 1) AS play_count,
               (SELECT likes_count FROM reel_metrics m WHERE m.reel_id = r.id
                 ORDER BY m.captured_at DESC LIMIT 1) AS likes_count,
               (SELECT COUNT(*)::int FROM reel_analyses a WHERE a.reel_id = r.id) AS analysis_count
          FROM reels r WHERE r.competitor_id = ${competitorId}
      `;
      const mapped = rows as unknown as Row[];
      const playCounts = mapped.map((row) => nullableNum(row.play_count)).filter((v): v is number => v !== null);
      const likeCounts = mapped.map((row) => nullableNum(row.likes_count)).filter((v): v is number => v !== null);
      const dates = mapped
        .map((row) => nullableStr(row.published_at))
        .filter((v): v is string => v !== null)
        .sort();
      stats.push({
        competitorId,
        importedReels: mapped.length,
        analysedReels: mapped.filter((row) => (nullableNum(row.analysis_count) ?? 0) > 0).length,
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
    await this.ready();
    const rows = await this.db`SELECT * FROM reels WHERE competitor_id = ${competitorId}`;
    const metricsRepo = new PostgresMetricsRepository(this.db);
    const result: Array<{ reel: Reel; metrics: ReelMetrics | null }> = [];
    for (const row of rows as unknown as Row[]) {
      const reel = mapReel(row);
      result.push({ reel, metrics: await metricsRepo.latestForReel(reel.id) });
    }
    return result;
  }

  async allTags(): Promise<string[]> {
    await this.ready();
    const rows = await this.db`SELECT tags FROM reels`;
    const set = new Set<string>();
    for (const row of rows as unknown as Row[]) {
      for (const tag of parseJsonArray(row.tags)) set.add(tag);
    }
    return [...set].sort((a, b) => a.localeCompare(b, "he"));
  }
}

class PostgresMediaRepository extends PostgresRepository implements MediaRepository {
  async listForReel(reelId: string): Promise<ReelMedia[]> {
    await this.ready();
    const rows = await this.db`
      SELECT * FROM reel_media WHERE reel_id = ${reelId} ORDER BY created_at DESC
    `;
    return (rows as unknown as Row[]).map(mapMedia);
  }

  async findById(mediaId: string): Promise<ReelMedia | null> {
    await this.ready();
    const rows = await this.db`SELECT * FROM reel_media WHERE id = ${mediaId} LIMIT 1`;
    return rows[0] ? mapMedia(rows[0] as Row) : null;
  }

  async create(input: ReelMediaInput): Promise<ReelMedia> {
    await this.ready();
    const record: ReelMedia = { ...input, id: input.id ?? id(), createdAt: now() };
    await this.db`
      INSERT INTO reel_media
        (id, reel_id, kind, storage_key, original_filename, mime_type, byte_size, created_at)
      VALUES
        (${record.id}, ${record.reelId}, ${record.kind}, ${record.storageKey},
         ${record.originalFilename}, ${record.mimeType}, ${record.byteSize}, ${record.createdAt})
    `;
    return record;
  }

  async remove(mediaId: string): Promise<void> {
    await this.ready();
    await this.db`DELETE FROM reel_media WHERE id = ${mediaId}`;
  }
}

class PostgresAnalysisRepository extends PostgresRepository implements AnalysisRepository {
  async latestForReel(reelId: string): Promise<ReelAnalysisRecord | null> {
    await this.ready();
    const rows = await this.db`
      SELECT * FROM reel_analyses WHERE reel_id = ${reelId} ORDER BY created_at DESC LIMIT 1
    `;
    return rows[0] ? mapAnalysis(rows[0] as Row) : null;
  }

  async findById(analysisId: string): Promise<ReelAnalysisRecord | null> {
    await this.ready();
    const rows = await this.db`SELECT * FROM reel_analyses WHERE id = ${analysisId} LIMIT 1`;
    return rows[0] ? mapAnalysis(rows[0] as Row) : null;
  }

  async create(input: ReelAnalysisInput): Promise<ReelAnalysisRecord> {
    await this.ready();
    const record: ReelAnalysisRecord = { ...input, id: input.id ?? id(), createdAt: now() };
    await this.db`
      INSERT INTO reel_analyses
        (id, reel_id, prompt_version, transcript_ref, language, provider, model,
         run_mode, analysed_at, payload, created_at)
      VALUES
        (${record.id}, ${record.reelId}, ${record.promptVersion}, ${record.transcriptRef},
         ${record.language}, ${record.provider}, ${record.model}, ${record.runMode},
         ${record.analysedAt}, ${JSON.stringify(record.payload)}, ${record.createdAt})
    `;
    return record;
  }
}

class PostgresComparisonRepository extends PostgresRepository implements ComparisonRepository {
  async findById(comparisonId: string): Promise<ReelComparison | null> {
    await this.ready();
    const rows = await this.db`SELECT * FROM reel_comparisons WHERE id = ${comparisonId} LIMIT 1`;
    return rows[0] ? mapComparison(rows[0] as Row) : null;
  }

  async create(input: ReelComparisonInput): Promise<ReelComparison> {
    await this.ready();
    const record: ReelComparison = { ...input, id: input.id ?? id(), createdAt: now() };
    await this.db`
      INSERT INTO reel_comparisons
        (id, reel_a_id, reel_b_id, comparability, notes, created_at)
      VALUES
        (${record.id}, ${record.reelAId}, ${record.reelBId},
         ${JSON.stringify(record.comparability)}, ${record.notes}, ${record.createdAt})
    `;
    return record;
  }

  async list(): Promise<ReelComparison[]> {
    await this.ready();
    const rows = await this.db`SELECT * FROM reel_comparisons ORDER BY created_at DESC`;
    return (rows as unknown as Row[]).map(mapComparison);
  }
}

class PostgresPatternRepository extends PostgresRepository implements PatternRepository {
  async list(): Promise<PatternCard[]> {
    await this.ready();
    const rows = await this.db`SELECT * FROM pattern_cards ORDER BY created_at DESC`;
    return (rows as unknown as Row[]).map(mapPattern);
  }

  async findById(patternId: string): Promise<PatternCard | null> {
    await this.ready();
    const rows = await this.db`SELECT * FROM pattern_cards WHERE id = ${patternId} LIMIT 1`;
    return rows[0] ? mapPattern(rows[0] as Row) : null;
  }

  async create(input: PatternCardInput): Promise<PatternCard> {
    await this.ready();
    const record: PatternCard = { ...input, id: input.id ?? id(), createdAt: now(), updatedAt: now() };
    await this.db`
      INSERT INTO pattern_cards
        (id, comparison_id, title, description, when_useful, supporting_reel_ids,
         counterexamples, evidence_count, confidence, baderech_translation,
         do_not_copy_note, created_at, updated_at)
      VALUES
        (${record.id}, ${record.comparisonId}, ${record.title}, ${record.description},
         ${record.whenUseful}, ${JSON.stringify(record.supportingReelIds)}, ${record.counterexamples},
         ${record.evidenceCount}, ${record.confidence}, ${record.baderechTranslation},
         ${record.doNotCopyNote}, ${record.createdAt}, ${record.updatedAt})
    `;
    return record;
  }

  async remove(patternId: string): Promise<void> {
    await this.ready();
    await this.db`DELETE FROM pattern_cards WHERE id = ${patternId}`;
  }
}

export function createPostgresRepositories(db: PostgresDb): Repositories {
  return {
    competitors: new PostgresCompetitorRepository(db),
    reels: new PostgresReelRepository(db),
    metrics: new PostgresMetricsRepository(db),
    media: new PostgresMediaRepository(db),
    analyses: new PostgresAnalysisRepository(db),
    comparisons: new PostgresComparisonRepository(db),
    patterns: new PostgresPatternRepository(db),
  };
}
