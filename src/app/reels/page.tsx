import Link from "next/link";

import { PerformanceBadge } from "@/components/decision";
import { ReelThumb } from "@/components/reel-thumb";
import { EmptyState, PageHeader, Tag, formatCount, formatDate, formatDuration } from "@/components/ui";
import { creatorRelativePerformance } from "@/lib/compare/comparability";
import { performanceLabel, type PerformanceLabel } from "@/lib/compare/performance-label";
import { getReadyRepositories } from "@/lib/demo/auto-seed";
import type { ReelFilters, ReelListItem } from "@/lib/domain/types";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function one(params: SearchParams, key: string): string {
  const value = params[key];
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

const STATUS_LABEL: Record<ReelListItem["analysisStatus"], string> = {
  none: "לא נותח",
  fixture: "ניתוח דוגמה",
  live: "נותח",
};

const STATUS_CLASS: Record<ReelListItem["analysisStatus"], string> = {
  none: "border-rule-strong text-ink-muted",
  fixture: "border-inferred/40 bg-inferred-wash text-inferred",
  live: "border-measured/40 bg-measured-wash text-measured",
};

function Metric({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div>
      <dt className="text-[0.68rem] text-ink-muted">{label}</dt>
      <dd
        dir="ltr"
        className={`text-start font-mono text-[0.85rem] tabular-nums ${muted ? "text-ink-faint" : "text-ink"}`}
      >
        {value}
      </dd>
    </div>
  );
}

function ReelCard({ item, performance }: { item: ReelListItem; performance: PerformanceLabel }) {
  const { reel, metrics, competitor } = item;
  const title = reel.caption?.trim() || reel.shortCode;

  return (
    <article className="lab-card flex gap-4 p-4">
      <ReelThumb
        shortCode={reel.shortCode}
        thumbnailUrl={reel.thumbnailUrl}
        hasVideoFile={item.hasVideoFile}
        className="w-20 shrink-0 sm:w-24"
      />

      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div>
          <h2 className="font-display text-[1.05rem] leading-snug">
            <Link
              href={`/reels/${reel.id}`}
              className="underline-offset-4 hover:underline focus-visible:underline"
            >
              <span className="line-clamp-2">{title}</span>
            </Link>
          </h2>
          <p className="mt-1 text-[0.78rem] text-ink-muted">
            {competitor.displayName}{" "}
            <span dir="ltr" className="font-mono">
              @{competitor.instagramUsername}
            </span>{" "}
            · <span className="font-mono">{formatDate(reel.publishedAt)}</span>
          </p>
        </div>

        <dl className="grid grid-cols-4 gap-2 border-y border-rule py-2">
          <Metric
            label="צפיות"
            value={formatCount(metrics?.playCount)}
            muted={metrics?.playCount == null}
          />
          <Metric label="לייקים" value={formatCount(metrics?.likesCount)} />
          <Metric label="תגובות" value={formatCount(metrics?.commentsCount)} />
          <Metric label="אורך" value={formatDuration(reel.durationSeconds)} />
        </dl>

        <div className="flex flex-wrap items-center gap-2">
          <PerformanceBadge performance={performance} />
          <span
            className={`rounded-[3px] border px-1.5 py-0.5 text-[0.7rem] ${STATUS_CLASS[item.analysisStatus]}`}
          >
            {STATUS_LABEL[item.analysisStatus]}
          </span>
          {reel.tags.slice(0, 2).map((tag) => (
            <Tag key={tag}>{tag}</Tag>
          ))}
        </div>

        <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
          <Link href={`/reels/${reel.id}`} className="lab-button">
            פתיחת ניתוח
          </Link>
          <Link href={`/compare?a=${reel.id}`} className="lab-button lab-button-quiet">
            בחירה להשוואה
          </Link>
          <a
            href={reel.sourceUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="ms-auto text-[0.75rem] text-ink-muted underline underline-offset-2"
          >
            פתיחה במקור
          </a>
        </div>
      </div>
    </article>
  );
}

export default async function ReelsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const repos = await getReadyRepositories();

  const filters: ReelFilters = {
    competitorId: one(params, "competitorId") || undefined,
    tag: one(params, "tag") || undefined,
    analysisStatus: (one(params, "analysisStatus") || "any") as ReelFilters["analysisStatus"],
    from: one(params, "from") ? `${one(params, "from")}T00:00:00.000Z` : undefined,
    to: one(params, "to") ? `${one(params, "to")}T23:59:59.999Z` : undefined,
    search: one(params, "search") || undefined,
  };

  const [items, competitors, tags, everything] = await Promise.all([
    repos.reels.list(filters),
    repos.competitors.list(),
    repos.reels.allTags(),
    repos.reels.list(),
  ]);

  // Cohorts are built from the full library, not the filtered view: a creator's
  // median must not shift because someone narrowed a date range.
  const cohorts = new Map<string, Array<{ reel: ReelListItem["reel"]; metrics: ReelListItem["metrics"] }>>();
  for (const entry of everything) {
    const bucket = cohorts.get(entry.reel.competitorId) ?? [];
    bucket.push({ reel: entry.reel, metrics: entry.metrics });
    cohorts.set(entry.reel.competitorId, bucket);
  }

  const cards = items.map((item) => ({
    item,
    performance: performanceLabel(
      creatorRelativePerformance(
        { reel: item.reel, metrics: item.metrics },
        cohorts.get(item.reel.competitorId) ?? [],
      ),
    ),
  }));

  const totalReels = everything.length;
  const filtered = totalReels !== items.length;

  return (
    <>
      <PageHeader
        eyebrow="שלב 2"
        title="ספריית רילים"
        lede="מה יובא, ואיך כל ריל עומד מול שאר הרילים של אותו יוצר. מספר חסר נשאר חסר."
        actions={
          <Link href="/import" className="lab-button lab-button-quiet">
            ייבוא ריל
          </Link>
        }
      />

      <details className="mb-6 rounded-[4px] border border-rule bg-paper-sunken/60">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-2.5 text-[0.85rem] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink">
          <span className="font-medium">סינון</span>
          <span className="text-[0.78rem] text-ink-muted">
            {filtered ? `${items.length} מתוך ${totalReels} רילים` : `${totalReels} רילים`}
          </span>
        </summary>

        <form className="grid gap-3 border-t border-rule px-4 py-4 sm:grid-cols-2 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <label className="lab-label" htmlFor="search">
              חיפוש בכיתוב
            </label>
            <input
              id="search"
              name="search"
              className="lab-input"
              defaultValue={one(params, "search")}
              placeholder="מילה מהכיתוב או shortCode"
            />
          </div>

          <div>
            <label className="lab-label" htmlFor="competitorId">
              יוצר
            </label>
            <select
              id="competitorId"
              name="competitorId"
              className="lab-input"
              defaultValue={one(params, "competitorId")}
            >
              <option value="">כולם</option>
              {competitors.map((competitor) => (
                <option key={competitor.id} value={competitor.id}>
                  {competitor.displayName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="lab-label" htmlFor="tag">
              תגית
            </label>
            <select id="tag" name="tag" className="lab-input" defaultValue={one(params, "tag")}>
              <option value="">כולן</option>
              {tags.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="lab-label" htmlFor="analysisStatus">
              סטטוס ניתוח
            </label>
            <select
              id="analysisStatus"
              name="analysisStatus"
              className="lab-input"
              defaultValue={one(params, "analysisStatus")}
            >
              <option value="any">הכול</option>
              <option value="analysed">נותח</option>
              <option value="none">לא נותח</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="lab-label" htmlFor="from">
                מתאריך
              </label>
              <input
                id="from"
                name="from"
                type="date"
                className="lab-input"
                defaultValue={one(params, "from")}
              />
            </div>
            <div>
              <label className="lab-label" htmlFor="to">
                עד
              </label>
              <input
                id="to"
                name="to"
                type="date"
                className="lab-input"
                defaultValue={one(params, "to")}
              />
            </div>
          </div>

          <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-6">
            <button type="submit" className="lab-button">
              סינון
            </button>
            {filtered ? (
              <Link href="/reels" className="lab-button lab-button-quiet">
                ניקוי סינון
              </Link>
            ) : null}
          </div>
        </form>
      </details>

      {totalReels === 0 ? (
        <EmptyState
          title="אין עדיין רילים"
          body="ייבאו תוצאת Apify לריל אחד או יותר, או טענו נתוני דמו מעמוד היוצרים כדי לראות איך הספרייה נראית מלאה."
          actionHref="/import"
          actionLabel="לעמוד הייבוא"
        />
      ) : items.length === 0 ? (
        <EmptyState
          title="הסינון לא החזיר כלום"
          body="נסו לנקות חלק מהתנאים. תאריכי פרסום חסרים נופלים מחוץ לכל טווח תאריכים."
          actionHref="/reels"
          actionLabel="ניקוי סינון"
        />
      ) : (
        <>
          <div className="grid gap-4 xl:grid-cols-2">
            {cards.map(({ item, performance }) => (
              <ReelCard key={item.reel.id} item={item} performance={performance} />
            ))}
          </div>
          <p className="mt-6 border-t border-rule pt-4 text-[0.8rem] leading-relaxed text-ink-muted">
            הסימון היחסי משווה כל ריל לחציון של אותו יוצר בלבד. הוא מתאר מה קרה — לא קובע
            שהריל טוב, ולא שהמבנה שלו הוא שהביא את המספרים. הרילים מסודרים לפי תאריך פרסום ולא
            לפי ביצועים.
          </p>
        </>
      )}
    </>
  );
}
