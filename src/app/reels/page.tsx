import Link from "next/link";

import { ReelThumb } from "@/components/reel-thumb";
import { EmptyState, PageHeader, Tag, formatCount, formatDate, formatDuration } from "@/components/ui";
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
  none: "border-rule-strong text-ink-faint",
  fixture: "border-inferred/40 bg-inferred-wash text-inferred",
  live: "border-measured/40 bg-measured-wash text-measured",
};

function ReelCard({ item }: { item: ReelListItem }) {
  const { reel, metrics, competitor } = item;

  return (
    <article className="lab-card flex flex-col overflow-hidden">
      <ReelThumb
        shortCode={reel.shortCode}
        thumbnailUrl={reel.thumbnailUrl}
        hasVideoFile={item.hasVideoFile}
      />

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <p className="line-clamp-3 text-[0.88rem] leading-relaxed">
            {reel.caption ?? <span className="text-ink-faint">בלי כיתוב בייבוא</span>}
          </p>
          <p className="mt-1.5 text-[0.72rem] text-ink-muted">
            {competitor.displayName} ·{" "}
            <span className="font-mono" dir="ltr">
              @{competitor.instagramUsername}
            </span>
          </p>
        </div>

        <dl className="grid grid-cols-4 gap-2 border-y border-rule py-2 text-center">
          <div>
            <dt className="text-[0.62rem] text-ink-faint">צפיות</dt>
            <dd
              className={`font-mono text-[0.8rem] tabular-nums ${
                metrics?.playCount == null ? "text-ink-faint" : ""
              }`}
            >
              {formatCount(metrics?.playCount)}
            </dd>
          </div>
          <div>
            <dt className="text-[0.62rem] text-ink-faint">לייקים</dt>
            <dd className="font-mono text-[0.8rem] tabular-nums">{formatCount(metrics?.likesCount)}</dd>
          </div>
          <div>
            <dt className="text-[0.62rem] text-ink-faint">תגובות</dt>
            <dd className="font-mono text-[0.8rem] tabular-nums">
              {formatCount(metrics?.commentsCount)}
            </dd>
          </div>
          <div>
            <dt className="text-[0.62rem] text-ink-faint">אורך</dt>
            <dd className="font-mono text-[0.8rem] tabular-nums">
              {formatDuration(reel.durationSeconds)}
            </dd>
          </div>
        </dl>

        <div className="flex flex-wrap items-center gap-1.5 text-[0.72rem] text-ink-muted">
          <span className="font-mono">{formatDate(reel.publishedAt)}</span>
          <span
            className={`rounded-[3px] border px-1.5 py-0.5 text-[0.65rem] ${STATUS_CLASS[item.analysisStatus]}`}
          >
            {STATUS_LABEL[item.analysisStatus]}
          </span>
          {reel.tags.slice(0, 3).map((tag) => (
            <Tag key={tag}>{tag}</Tag>
          ))}
        </div>

        <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
          <Link href={`/reels/${reel.id}`} className="lab-button">
            פתיחה
          </Link>
          <Link href={`/reels/${reel.id}#analysis`} className="lab-button lab-button-quiet">
            ניתוח
          </Link>
          <Link href={`/compare?a=${reel.id}`} className="lab-button lab-button-quiet">
            השוואה
          </Link>
          <a
            href={reel.sourceUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="ms-auto text-[0.72rem] text-ink-faint underline underline-offset-2"
          >
            מקור
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

  const [items, competitors, tags] = await Promise.all([
    repos.reels.list(filters),
    repos.competitors.list(),
    repos.reels.allTags(),
  ]);

  const totalReels = (await repos.reels.list()).length;
  const filtered = totalReels !== items.length;

  return (
    <>
      <PageHeader
        eyebrow="שלב 2"
        title="ספריית רילים"
        lede="כל מה שיובא, עם המדדים הציבוריים כפי שהגיעו. מספר חסר נשאר חסר — הוא לא הופך לאפס."
        actions={
          <Link href="/import" className="lab-button">
            ייבוא ריל
          </Link>
        }
      />

      <form className="lab-card mb-6 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-6">
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
          <p className="ms-auto self-center text-[0.75rem] text-ink-muted">
            {items.length} מתוך {totalReels} רילים
          </p>
        </div>
      </form>

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
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => (
              <ReelCard key={item.reel.id} item={item} />
            ))}
          </div>
          <p className="mt-6 border-t border-rule pt-4 text-[0.78rem] leading-relaxed text-ink-muted">
            הרילים מסודרים לפי תאריך פרסום, לא לפי ביצועים. השוואת מספרים בין תקופות שונות אינה
            השוואה — היא מדידה של שני עולמות הפצה שונים.
          </p>
        </>
      )}
    </>
  );
}
