import Link from "next/link";
import { notFound } from "next/navigation";

import {
  EvidenceLedgerBar,
  EvidenceLegend,
  FindingRow,
  ListFindingRow,
  TimelineFindingRow,
} from "@/components/evidence";
import {
  Callout,
  EmptyState,
  PageHeader,
  Stat,
  Tag,
  formatCount,
  formatDate,
  formatDuration,
} from "@/components/ui";
import {
  ANALYSIS_FIELDS,
  buildEvidenceLedger,
  type ListFinding,
  type Finding,
  type TimelineFinding,
} from "@/lib/analysis/schema";
import { getReadyRepositories } from "@/lib/demo/auto-seed";
import { loadAnalysis } from "@/lib/services/analysis";

import { RunAnalysisForm } from "./run-analysis-form";

export const dynamic = "force-dynamic";

export default async function ReelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const repos = await getReadyRepositories();

  const reel = await repos.reels.findById(id);
  if (!reel) notFound();

  const [competitor, metrics, media, analysis] = await Promise.all([
    repos.competitors.findById(reel.competitorId),
    repos.metrics.latestForReel(id),
    repos.media.listForReel(id),
    loadAnalysis(id),
  ]);

  const video = media.find((item) => item.kind === "video") ?? null;
  const ledger = analysis ? buildEvidenceLedger(analysis.payload) : null;

  return (
    <>
      <PageHeader
        eyebrow={competitor ? competitor.displayName : "ריל"}
        title={reel.caption?.slice(0, 70) ?? reel.shortCode}
        lede={`shortCode ${reel.shortCode} · יובא ${formatDate(reel.importedAt)} · מקור: ${reel.importSource}`}
        actions={
          <>
            <Link href={`/compare?a=${reel.id}`} className="lab-button lab-button-quiet">
              השוואה מול ריל אחר
            </Link>
            <a
              href={reel.sourceUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="lab-button lab-button-quiet"
            >
              פתיחה באינסטגרם
            </a>
          </>
        }
      />

      <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
        <aside className="space-y-4">
          <section className="lab-card p-4">
            <h2 className="font-display text-base">מדדים ציבוריים</h2>
            <div className="mt-3 grid grid-cols-2 gap-4">
              <Stat
                label="צפיות"
                value={formatCount(metrics?.playCount)}
                muted={metrics?.playCount == null}
                hint={metrics?.playCount == null ? "לא הופיע בייבוא" : undefined}
              />
              <Stat label="לייקים" value={formatCount(metrics?.likesCount)} />
              <Stat label="תגובות" value={formatCount(metrics?.commentsCount)} />
              <Stat label="אורך" value={formatDuration(reel.durationSeconds)} />
            </div>
            <dl className="mt-4 space-y-1.5 border-t border-rule pt-3 text-[0.75rem]">
              <div className="flex justify-between gap-2">
                <dt className="text-ink-faint">פורסם</dt>
                <dd className="font-mono">{formatDate(reel.publishedAt)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-ink-faint">נמדד</dt>
                <dd className="font-mono">{formatDate(metrics?.capturedAt)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-ink-faint">שפה</dt>
                <dd className="font-mono">{reel.language ?? "—"}</dd>
              </div>
            </dl>
            {reel.tags.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-1.5 border-t border-rule pt-3">
                {reel.tags.map((tag) => (
                  <Tag key={tag}>{tag}</Tag>
                ))}
              </div>
            ) : null}
          </section>

          <section className="lab-card p-4">
            <h2 className="font-display text-base">מדיה מקומית</h2>
            {video ? (
              <>
                <video
                  controls
                  preload="metadata"
                  className="mt-3 w-full rounded-[3px] border border-rule bg-ink"
                  src={`/api/media/${video.id}`}
                />
                <p className="mt-2 font-mono text-[0.7rem] text-ink-faint" dir="ltr">
                  {video.originalFilename} · {Math.round(video.byteSize / 1024)} KB
                </p>
              </>
            ) : (
              <p className="mt-2 text-[0.82rem] leading-relaxed text-ink-muted">
                לא צורף קובץ MP4. אפשר לצרף אותו בעמוד הייבוא — הקובץ נשמר מקומית בלבד ואינו נכנס
                ל-git.
              </p>
            )}
          </section>

          <section className="lab-card p-4">
            <h2 className="font-display text-base">תמלול</h2>
            {reel.transcript ? (
              <p className="mt-2 max-h-64 overflow-y-auto text-[0.82rem] leading-relaxed text-ink-muted">
                {reel.transcript}
              </p>
            ) : (
              <p className="mt-2 text-[0.82rem] text-ink-muted">
                אין תמלול בייבוא. ניתוח שירוץ יסתמך על הכיתוב בלבד ויציין זאת.
              </p>
            )}
          </section>
        </aside>

        <section id="analysis" className="space-y-4">
          <div className="lab-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="font-display text-xl">ניתוח מבני</h2>
                <p className="mt-1 max-w-xl text-[0.82rem] leading-relaxed text-ink-muted">
                  כל שדה מסומן כנמדד, נצפה או מוסק. שימור צופים מסומן תמיד כמוסק — לנתונים
                  הציבוריים של אינסטגרם אין עקומת צפייה.
                </p>
              </div>
              <RunAnalysisForm reelId={reel.id} hasAnalysis={analysis !== null} />
            </div>

            {analysis && ledger ? (
              <div className="mt-4 space-y-3 border-t border-rule pt-4">
                <EvidenceLedgerBar ledger={ledger} />
                <EvidenceLegend />
                <dl className="grid grid-cols-2 gap-x-4 gap-y-1 border-t border-rule pt-3 text-[0.72rem] sm:grid-cols-4">
                  <div>
                    <dt className="text-ink-faint">ספק</dt>
                    <dd className="font-mono">{analysis.record.provider}</dd>
                  </div>
                  <div>
                    <dt className="text-ink-faint">מודל</dt>
                    <dd className="font-mono">{analysis.record.model ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-ink-faint">גרסת פרומפט</dt>
                    <dd className="font-mono" dir="ltr">
                      {analysis.record.promptVersion}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-ink-faint">זמן ניתוח</dt>
                    <dd className="font-mono">{formatDate(analysis.record.analysedAt)}</dd>
                  </div>
                  <div className="col-span-2 sm:col-span-4">
                    <dt className="text-ink-faint">הפניית תמלול</dt>
                    <dd className="font-mono" dir="ltr">
                      {analysis.record.transcriptRef ?? "—"}
                    </dd>
                  </div>
                </dl>
              </div>
            ) : null}
          </div>

          {analysis?.record.runMode === "fixture" ? (
            <Callout tone="caution" title="זהו ניתוח דוגמה, לא הרצה של מודל">
              הניתוח הזה הוא פיקסצ׳ר מוכן מראש שנועד להדגים את המבנה בלי חיבור לספק ניתוח.
              להרצה אמיתית: הגדירו <span className="font-mono">ANALYSIS_PROVIDER=anthropic</span> ו-
              <span className="font-mono">ANALYSIS_API_KEY</span> בקובץ{" "}
              <span className="font-mono">.env</span>.
            </Callout>
          ) : null}

          {analysis === null ? (
            <EmptyState
              title="הריל הזה עדיין לא נותח"
              body="הריצו ניתוח כדי לפרק את הריל לשדות מבניים. בלי ספק ניתוח מוגדר, ניתוח דוגמה קיים רק לרילים של הדמו — הכלי לא ימציא ניתוח לריל שלא ראה."
            />
          ) : (
            <div className="space-y-2">
              {ANALYSIS_FIELDS.map((field) => {
                const value = analysis.payload[field.key];
                if (field.kind === "timeline") {
                  return (
                    <TimelineFindingRow
                      key={field.key}
                      label={field.label}
                      finding={value as TimelineFinding}
                    />
                  );
                }
                if (field.kind === "list") {
                  return (
                    <ListFindingRow
                      key={field.key}
                      label={field.label}
                      finding={value as ListFinding}
                    />
                  );
                }
                return (
                  <FindingRow key={field.key} label={field.label} finding={value as Finding} />
                );
              })}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
