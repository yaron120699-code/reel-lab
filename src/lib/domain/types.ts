/**
 * Domain entities. Deliberately free of any storage or framework types so the
 * SQLite repositories can later be swapped for Supabase without touching the UI.
 */

export type Country = "IL" | "US" | "OTHER";

/**
 * Create inputs normally let the repository mint an id. The demo fixtures pass
 * one in so that every serverless instance reconstructs the same rows under the
 * same ids, which is what makes /reels/<id> links survive a cold start.
 */
export type WithOptionalId<T> = T & { id?: string };

export type Competitor = {
  id: string;
  displayName: string;
  instagramUsername: string;
  profileUrl: string;
  country: Country;
  niche: string;
  relevanceNote: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
};

export type CompetitorInput = WithOptionalId<Omit<Competitor, "id" | "createdAt" | "updatedAt">>;

/** How a reel got into the lab. Provenance is never inferred or overwritten. */
export type ImportSource = "apify-json-manual" | "apify-api" | "demo-fixture";

export type Reel = {
  id: string;
  competitorId: string;
  sourceUrl: string;
  shortCode: string;
  caption: string | null;
  publishedAt: string | null;
  durationSeconds: number | null;
  language: string | null;
  transcript: string | null;
  ownerUsername: string | null;
  thumbnailUrl: string | null;
  remoteVideoUrl: string | null;
  tags: string[];
  importSource: ImportSource;
  importedAt: string;
  /** Verbatim Apify item, kept so every field can be traced back to its source. */
  rawPayload: unknown;
  createdAt: string;
  updatedAt: string;
};

export type ReelInput = WithOptionalId<Omit<Reel, "id" | "createdAt" | "updatedAt">>;

/**
 * A single capture of public metrics. Null means "not present in the source",
 * never zero — the lab does not fabricate missing metrics.
 */
export type ReelMetrics = {
  id: string;
  reelId: string;
  playCount: number | null;
  likesCount: number | null;
  commentsCount: number | null;
  capturedAt: string;
  source: string;
};

export type ReelMetricsInput = WithOptionalId<Omit<ReelMetrics, "id">>;

export type MediaKind = "video" | "thumbnail";

export type ReelMedia = {
  id: string;
  reelId: string;
  kind: MediaKind;
  storageKey: string;
  originalFilename: string | null;
  mimeType: string;
  byteSize: number;
  createdAt: string;
};

export type ReelMediaInput = WithOptionalId<Omit<ReelMedia, "id" | "createdAt">>;

export type AnalysisRunMode = "live" | "fixture";

export type ReelAnalysisRecord = {
  id: string;
  reelId: string;
  promptVersion: string;
  transcriptRef: string | null;
  language: string | null;
  provider: string;
  model: string | null;
  runMode: AnalysisRunMode;
  analysedAt: string;
  payload: unknown;
  createdAt: string;
};

export type ReelAnalysisInput = WithOptionalId<Omit<ReelAnalysisRecord, "id" | "createdAt">>;

export type ReelComparison = {
  id: string;
  reelAId: string;
  reelBId: string;
  comparability: unknown;
  notes: string | null;
  createdAt: string;
};

export type ReelComparisonInput = WithOptionalId<Omit<ReelComparison, "id" | "createdAt">>;

export type Confidence = "low" | "medium" | "high";

export type PatternCard = {
  id: string;
  comparisonId: string | null;
  title: string;
  description: string;
  whenUseful: string;
  supportingReelIds: string[];
  counterexamples: string;
  evidenceCount: number;
  confidence: Confidence;
  baderechTranslation: string;
  doNotCopyNote: string;
  createdAt: string;
  updatedAt: string;
};

export type PatternCardInput = WithOptionalId<Omit<PatternCard, "id" | "createdAt" | "updatedAt">>;

/** Read model: a reel with its latest metrics, media and analysis status. */
export type ReelListItem = {
  reel: Reel;
  competitor: Pick<Competitor, "id" | "displayName" | "instagramUsername">;
  metrics: ReelMetrics | null;
  hasVideoFile: boolean;
  videoMediaId: string | null;
  analysisStatus: "none" | "fixture" | "live";
  latestAnalysisId: string | null;
};

export type ReelFilters = {
  competitorId?: string;
  tag?: string;
  analysisStatus?: "any" | "none" | "analysed";
  from?: string;
  to?: string;
  search?: string;
};
