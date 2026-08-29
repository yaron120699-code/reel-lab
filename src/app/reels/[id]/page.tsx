import Link from "next/link";
import { notFound } from "next/navigation";

import { Disclosure, PerformanceBadge, WorkingHypothesis } from "@/components/decision";
import {
  EvidenceChip,
  EvidenceLedgerBar,
  EvidenceLegend,
  FindingRow,
  ListFindingRow,
  TimelineFindingRow,
} from "@/components/evidence";
import { ReelThumb } from "@/components/reel-thumb";
import { Callout, EmptyState, PageHeader, Stat, Tag, formatCount, formatDate, formatDuration } from "@/components/ui";
import {
  ANALYSIS_FIELDS,
  buildEvidenceLedger,
  type Finding,
  type ListFinding,
  type ReelAnalysisPayload,
  type TimelineFinding,
} from "@/lib/analysis/schema";
import { creatorRelativePerformance } from "@/lib/compare/comparability";
import { performanceLabel } from "@/lib/compare/performance-label";
import { getReadyRepositories } from "@/lib/demo/auto-seed";
import { loadAnalysis } from "@/lib/services/analysis";

import { RunAnalysisForm } from "./run-analysis-form";

export const dynamic = "force-dynamic";

/**
 * The five fields the top summary is allowed to show. The summary reads stored
 * analysis only — it never synthesises a new conclusion in the view layer.
 */
const SUMMARY_FIELD_KEYS = [
  "verbalHook",
  "hookMechanism",
  "openLoops",
  "payoff",
  "transferableLesson",
] as const;

/** Fields already surfaced above; the full list below skips them. */
const SUMMARY_KEY_SET: ReadonlySet<string> = new Set(SUMMARY_FIELD_KEYS);

function SummaryItem({
  question,
  children,
}: {
  question: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-t border-rule pt-3 first:border-t-0 first:pt-0">
      <h3 className="font-display text-[0.95rem] text-ink-muted">{question}</h3>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function ObservedValue({ finding }: { finding: Finding }) {
  return (
    <>
      <p className="text-[0.95rem] leading-relaxed">{finding.value}</p>
      <span className="mt-1.5 inline-flex items-center gap-2">
        <EvidenceChip kind={finding.evidence} />
        {finding.note ? (
          <span className="text-[0.75rem] text-ink-muted">{finding.note}</span>
        ) : null}
      </span>
    </>
  );
}

function DecisionSummary({ payload }: { payload: ReelAnalysisPayload }) {
  const { verbalHook, hookMechanism, openLoops, payoff, transferableLesson } = payload;

  return (
    <section className="lab-card p-5">
      <h2 className="font-display text-xl">מה כדאי להבין מהריל הזה</h2>
      <p className="mt-1 text-[0.8rem] text-ink-muted">
        חמישה שדות מתוך הניתוח השמור. שום מסקנה חדשה לא נוצרת כאן.
      </p>

      <div className="mt-4 space-y-3">
        <SummaryItem question="מה היה ההוק?">
          <ObservedValue finding={verbalHook} />
        </SummaryItem>

        <SummaryItem question="מה החזיק את הריל בתנועה?">
          {openLoops.items.length === 0 ? (
            <p className="text-[0.92rem] text-ink-faint">לא זוהתה לולאה פתוחה.</p>
          ) : (
            <ul className="space-y-1">
              {openLoops.items.map((item, index) => (
                <li key={index} className="flex gap-2 text-[0.95rem] leading-relaxed">
                  <span aria-hidden="true" className="text-ink-faint">
                    ·
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          )}
          <span className="mt-1.5 inline-flex">
            <EvidenceChip kind={openLoops.evidence} />
          </span>
        </SummaryItem>

        <SummaryItem question="איפה היה הפייאוף?">
          <ObservedValue finding={payoff} />
        </SummaryItem>

        <SummaryItem question="מה ההשערה לגבי המנגנון?">
          <WorkingHypothesis>
            <p>{hookMechanism.value}</p>
          </WorkingHypothesis>
        </SummaryItem>

        <SummaryItem question="מה אפשר לקחת מבחינה מבנית?">
          {transferableLesson.evidence === "inferred" ? (
            <WorkingHypothesis>
              <p>{transferableLesson.value}</p>
            </WorkingHypothesis>
          ) : (
            <ObservedValue finding={transferableLesson} />
          )}
        </SummaryItem>
      </div>
    </section>
  );
}

function StructureMap({ timeline }: { timeline: TimelineFinding }) {
  return (
    <section className="lab-card p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-xl">מפת המבנה</h2>
        <EvidenceChip kind={timeline.evidence} />
      </div>

      {/* Wide screens: a horizontal run of beats. */}
      <ol className="mt-4 hidden gap-3 lg:grid" style={{ gridTemplateColumns: `repeat(${timeline.beats.length}, minmax(0, 1fr))` }}>
        {timeline.beats.map((beat, index) => (
          <li key={index} className="relative">
            <div aria-hidden="true" className="mb-2 h-0.5 w-full bg-rule-strong" />
            <p dir="ltr" className="text-start font-mono text-[0.7rem] tabular-nums text-ink-muted">
              {beat.at}
            </p>
            <p className="mt-0.5 text-[0.85rem] font-semibold leading-snug">{beat.label}</p>
            <p className="mt-1 text-[0.78rem] leading-relaxed text-ink-muted">{beat.description}</p>
          </li>
        ))}
      </ol>

      {/* Narrow screens: the same beats stacked. */}
      <ol className="mt-4 space-y-3 lg:hidden">
        {timeline.beats.map((beat, index) => (
          <li key={index} className="spine border-s-observed ps-3">
            <p dir="ltr" className="text-start font-mono text-[0.7rem] tabular-nums text-ink-muted">
              {beat.at}
            </p>
            <p className="text-[0.9rem] font-semibold">{beat.label}</p>
            <p className="text-[0.82rem] leading-relaxed text-ink-muted">{beat.description}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function BaderechTranslation({ payload }: { payload: ReelAnalysisPayload }) {
  return (
    <section className="spine border-s-measured rounded-[4px] border border-rule bg-measured-wash/35 p-5">
      <h2 className="font-display text-xl">איך אפשר להעביר את המבנה לדרך</h2>

      <div className="mt-3">
        <p className="text-[0.72rem] font-semibold text-ink-muted">הלקח המבני</p>
        <p className="mt-1 text-[0.95rem] leading-relaxed">{payload.transferableLesson.value}</p>
        <span className="mt-1.5 inline-flex items-center gap-2">
          <EvidenceChip kind={payload.transferableLesson.evidence} />
        </span>
      </div>

      {payload.risks.items.length > 0 ? (
        <div className="mt-4 border-t border-rule pt-3">
          <p className="text-[0.72rem] font-semibold text-inferred">מה עלול להישבר</p>
          <ul className="mt-1 space-y-1">
            {payload.risks.items.map((item, index) => (
              <li key={index} className="flex gap-2 text-[0.88rem] leading-relaxed">
                <span aria-hidden="true" className="text-ink-faint">
                  ·
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-4 border-t border-rule pt-3">
        <p className="text-[0.72rem] font-semibold text-inferred">לא להעתיק</p>
        <p className="mt-1 text-[0.88rem] leading-relaxed">
          ניסוח, פרסונה, שמות מקומות וסגנון דיבור נשארים אצל היוצר. עובר המבנה בלבד.
        </p>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-rule pt-4">
        <button
          type="button"
          disabled
          aria-disabled="true"
          className="lab-button lab-button-quiet"
        >
          לקחת את המבנה לתוכן שלי
        </button>
        <span className="rounded-[3px] border border-rule-strong bg-paper px-1.5 py-0.5 text-[0.7rem] text-ink-muted">
          בשלב הבא
        </span>
      </div>
      <p className="mt-2 text-[0.75rem] text-ink-muted">
        הכפתור לא פעיל עדיין. שלב ה-Idea Lab לא נבנה.
      </p>
    </section>
  );
}

export default async function ReelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const repos = await getReadyRepositories();

  const reel = await repos.reels.findById(id);
  if (!reel) notFound();

  const [competitor, metrics, media, analysis, cohort] = await Promise.all([
    repos.competitors.findById(reel.competitorId),
    repos.metrics.latestForReel(id),
    repos.media.listForReel(id),
    loadAnalysis(id),
    repos.reels.cohortForCompetitor(reel.competitorId),
  ]);

  const video = media.find((item) => item.kind === "video") ?? null;
  const payload = analysis?.payload ?? null;
  const ledger = payload ? buildEvidenceLedger(payload) : null;
  const performance = performanceLabel(creatorRelativePerformance({ reel, metrics }, cohort));

  const remainingFields = ANALYSIS_FIELDS.filter(
    (field) => !SUMMARY_KEY_SET.has(field.key) && field.key !== "structureTimeline",
  );

  return (
    <>
      <PageHeader
        eyebrow={competitor ? competitor.displayName : "ריל"}
        title={reel.caption?.slice(0, 70) ?? reel.shortCode}
        actions={
          <Link href={`/compare?a=${reel.id}`} className="lab-button lab-button-quiet">
            בחירה להשוואה
          </Link>
        }
      />

      {/* Content first in the DOM; under RTL the media column lands on the left. */}
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0 space-y-5">
          {payload === null ? (
            <EmptyState
              title="הריל הזה עדיין לא נותח"
              body="הריצו ניתוח כדי לפרק את הריל לשדות מבניים. בלי ספק ניתוח מוגדר, ניתוח דוגמה קיים רק לרילים של הדמו — הכלי לא ימציא ניתוח לריל שלא ראה."
            >
              <RunAnalysisForm reelId={reel.id} hasAnalysis={false} />
            </EmptyState>
          ) : (
            <>
              {analysis?.record.runMode === "fixture" ? (
                <Callout tone="caution" title="זהו ניתוח דוגמה, לא הרצה של מודל">
                  פיקסצ׳ר מוכן מראש שנועד להדגים את המבנה בלי חיבור לספק ניתוח.
                </Callout>
              ) : null}

              <DecisionSummary payload={payload} />
              <StructureMap timeline={payload.structureTimeline} />
              <BaderechTranslation payload={payload} />

              <div className="space-y-2">
                <p className="text-[0.78rem] text-ink-muted">
                  כל חומר המחקר נשאר זמין, רק מתחת להחלטה.
                </p>

                <Disclosure title="שאר שדות הניתוח" hint={`${remainingFields.length} שדות`}>
                  <div className="space-y-2">
                    {remainingFields.map((field) => {
                      const value = payload[field.key];
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
                        <FindingRow
                          key={field.key}
                          label={field.label}
                          finding={value as Finding}
                        />
                      );
                    })}
                  </div>
                </Disclosure>

                <Disclosure title="ציר המבנה המלא">
                  <TimelineFindingRow
                    label="ציר מבנה וביטים"
                    finding={payload.structureTimeline}
                  />
                </Disclosure>

                {ledger ? (
                  <Disclosure title="מד הראיות" hint={`${ledger.total} שדות`}>
                    <div className="space-y-3">
                      <EvidenceLedgerBar ledger={ledger} />
                      <EvidenceLegend />
                      <p className="text-[0.8rem] leading-relaxed text-ink-muted">
                        שימור צופים מסומן תמיד כמוסק. לנתונים הציבוריים של אינסטגרם אין עקומת
                        צפייה, ולכן טענה על שימור של יוצר אחר יכולה להיות רק היפותזה.
                      </p>
                    </div>
                  </Disclosure>
                ) : null}

                <Disclosure title="תמלול מלא">
                  {reel.transcript ? (
                    <p className="max-h-80 overflow-y-auto text-[0.85rem] leading-relaxed text-ink-muted">
                      {reel.transcript}
                    </p>
                  ) : (
                    <p className="text-[0.85rem] text-ink-muted">
                      אין תמלול בייבוא. ניתוח שירוץ יסתמך על הכיתוב בלבד ויציין זאת.
                    </p>
                  )}
                </Disclosure>

                <Disclosure title="מקור, מדידה וספק הניתוח">
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-[0.78rem] sm:grid-cols-3">
                    <div>
                      <dt className="text-ink-muted">shortCode</dt>
                      <dd dir="ltr" className="text-start font-mono">
                        {reel.shortCode}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-ink-muted">מקור הייבוא</dt>
                      <dd dir="ltr" className="text-start font-mono">
                        {reel.importSource}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-ink-muted">יובא</dt>
                      <dd className="font-mono">{formatDate(reel.importedAt)}</dd>
                    </div>
                    <div>
                      <dt className="text-ink-muted">נמדד</dt>
                      <dd className="font-mono">{formatDate(metrics?.capturedAt)}</dd>
                    </div>
                    <div>
                      <dt className="text-ink-muted">ספק</dt>
                      <dd dir="ltr" className="text-start font-mono">
                        {analysis?.record.provider ?? "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-ink-muted">מודל</dt>
                      <dd dir="ltr" className="text-start font-mono">
                        {analysis?.record.model ?? "—"}
                      </dd>
                    </div>
                    <div className="col-span-2 sm:col-span-3">
                      <dt className="text-ink-muted">גרסת פרומפט</dt>
                      <dd dir="ltr" className="text-start font-mono">
                        {analysis?.record.promptVersion ?? "—"}
                      </dd>
                    </div>
                    <div className="col-span-2 sm:col-span-3">
                      <dt className="text-ink-muted">הפניית תמלול</dt>
                      <dd dir="ltr" className="text-start font-mono">
                        {analysis?.record.transcriptRef ?? "—"}
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-4 border-t border-rule pt-3">
                    <RunAnalysisForm reelId={reel.id} hasAnalysis={true} />
                  </div>
                </Disclosure>
              </div>
            </>
          )}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          {video ? (
            <video
              controls
              preload="metadata"
              className="aspect-[9/16] w-full rounded-[3px] border border-rule bg-ink"
              src={`/api/media/${video.id}`}
            />
          ) : (
            <ReelThumb
              shortCode={reel.shortCode}
              thumbnailUrl={reel.thumbnailUrl}
              hasVideoFile={false}
            />
          )}

          <div className="lab-card p-4">
            <dl className="grid grid-cols-2 gap-3">
              <Stat
                label="צפיות"
                value={formatCount(metrics?.playCount)}
                muted={metrics?.playCount == null}
              />
              <Stat label="לייקים" value={formatCount(metrics?.likesCount)} />
              <Stat label="תגובות" value={formatCount(metrics?.commentsCount)} />
              <Stat label="אורך" value={formatDuration(reel.durationSeconds)} />
            </dl>

            <div className="mt-3 border-t border-rule pt-3">
              <PerformanceBadge performance={performance} />
              <p className="mt-1.5 text-[0.75rem] leading-relaxed text-ink-muted">
                {performance.caveat}
              </p>
            </div>

            <p className="mt-3 border-t border-rule pt-3 text-[0.75rem] text-ink-muted">
              פורסם <span className="font-mono">{formatDate(reel.publishedAt)}</span>
            </p>

            {reel.tags.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {reel.tags.map((tag) => (
                  <Tag key={tag}>{tag}</Tag>
                ))}
              </div>
            ) : null}

            <a
              href={reel.sourceUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="mt-3 inline-block text-[0.78rem] text-ink-muted underline underline-offset-2"
            >
              פתיחה במקור
            </a>
          </div>
        </aside>
      </div>
    </>
  );
}
