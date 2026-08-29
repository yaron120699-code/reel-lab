import type {
  Competitor,
  CompetitorInput,
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

/**
 * The seam between the app and its storage. The UI and services only ever talk
 * to these interfaces, so moving from SQLite to Supabase means writing a second
 * implementation of this file — nothing else changes.
 */

export interface CompetitorRepository {
  list(): Promise<Competitor[]>;
  findById(id: string): Promise<Competitor | null>;
  findByUsername(username: string): Promise<Competitor | null>;
  create(input: CompetitorInput): Promise<Competitor>;
  update(id: string, input: Partial<CompetitorInput>): Promise<Competitor>;
  remove(id: string): Promise<void>;
}

export type CompetitorStats = {
  competitorId: string;
  importedReels: number;
  analysedReels: number;
  reelsWithPlayCount: number;
  medianPlayCount: number | null;
  medianLikes: number | null;
  earliestPublishedAt: string | null;
  latestPublishedAt: string | null;
};

export interface ReelRepository {
  list(filters?: ReelFilters): Promise<ReelListItem[]>;
  findById(id: string): Promise<Reel | null>;
  findByShortCode(competitorId: string, shortCode: string): Promise<Reel | null>;
  create(input: ReelInput): Promise<Reel>;
  update(id: string, input: Partial<ReelInput>): Promise<Reel>;
  remove(id: string): Promise<void>;
  statsByCompetitor(): Promise<CompetitorStats[]>;
  /** Sibling reels by the same creator, used to build a performance cohort. */
  cohortForCompetitor(competitorId: string): Promise<Array<{ reel: Reel; metrics: ReelMetrics | null }>>;
  allTags(): Promise<string[]>;
}

export interface MetricsRepository {
  latestForReel(reelId: string): Promise<ReelMetrics | null>;
  record(input: ReelMetricsInput): Promise<ReelMetrics>;
}

export interface MediaRepository {
  listForReel(reelId: string): Promise<ReelMedia[]>;
  findById(id: string): Promise<ReelMedia | null>;
  create(input: ReelMediaInput): Promise<ReelMedia>;
  remove(id: string): Promise<void>;
}

export interface AnalysisRepository {
  latestForReel(reelId: string): Promise<ReelAnalysisRecord | null>;
  findById(id: string): Promise<ReelAnalysisRecord | null>;
  create(input: ReelAnalysisInput): Promise<ReelAnalysisRecord>;
}

export interface ComparisonRepository {
  findById(id: string): Promise<ReelComparison | null>;
  create(input: ReelComparisonInput): Promise<ReelComparison>;
  list(): Promise<ReelComparison[]>;
}

export interface PatternRepository {
  list(): Promise<PatternCard[]>;
  findById(id: string): Promise<PatternCard | null>;
  create(input: PatternCardInput): Promise<PatternCard>;
  remove(id: string): Promise<void>;
}

export type Repositories = {
  competitors: CompetitorRepository;
  reels: ReelRepository;
  metrics: MetricsRepository;
  media: MediaRepository;
  analyses: AnalysisRepository;
  comparisons: ComparisonRepository;
  patterns: PatternRepository;
};
