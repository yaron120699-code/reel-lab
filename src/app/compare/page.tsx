import Link from "next/link";

import { saveComparisonAction } from "@/app/actions";
import { ConfidenceMeter, EvidenceChip } from "@/components/evidence";
import {
  Callout,
  EmptyState,
  PageHeader,
  formatCount,
  formatDate,
  formatDuration,
} from "@/components/ui";
import type { Finding, ListFinding, TimelineFinding } from "@/lib/analysis/schema";
import type { CheckStatus, PerformanceIndex } from "@/lib/compare/comparability";
import { getReadyRepositories } from "@/lib/demo/auto-seed";
import { buildComparison, type ComparisonSideView } from "@/lib/services/comparison";

import { PatternForm } from "./pattern-form";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function one(params: SearchParams, key: string): string {
  const value = params[key];
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

const STATUS_MARK: Record<CheckStatus, string> = {
  match: "●",
  mismatch: "▲",
  unknown: "○",
};

const STATUS_CLASS: Record<CheckStatus, string> = {
  match: "text-measured",
  mismatch: "text-inferred",
  unknown: "text-ink-faint",
};

const STATUS_LABEL: Record<CheckStatus, string> = {
  match: "תואם",
  mismatch: "לא תואם",
  unknown: "לא ידוע",
};

function CompareRow({
  label,
  left,
  right,
}: {
  label: string;
  left: React.ReactNode;
  right: React.ReactNode;
}) {
  return (
    <div className="grid gap-2 border-t border-rule py-3 md:grid-cols-2 md:gap-6">
      <p className="font-display text-[0.9rem] text-ink-muted md:col-span-2">{label}</p>
      <div className="text-[0.88rem] leading-relaxed">{left}</div>
      <div className="text-[0.88rem] leading-relaxed">{right}</div>
    </div>
  );
}

function FindingCell({ finding }: { finding: Finding | undefined }) {
  if (!finding) return <span className="text-ink-faint">אין ניתוח לריל הזה.</span>;
  return (
    <>
      <p>{finding.value}</p>
      <span className="mt-1.5 flex flex-wrap items-center gap-2">
        <EvidenceChip kind={finding.evidence} />
        {finding.confidence ? <ConfidenceMeter level={finding.confidence} /> : null}
      </span>
    </>
  );
}

function ListCell({ finding }: { finding: ListFinding | undefined }) {
  if (!finding) return <span className="text-ink-faint">אין ניתוח לריל הזה.</span>;
  return (
    <>
      <ul className="space-y-0.5">
        {finding.items.map((item, index) => (
          <li key={index} className="flex gap-2">
            <span aria-hidden="true" className="text-ink-faint">
              ·
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
      <span className="mt-1.5 flex flex-wrap items-center gap-2">
        <EvidenceChip kind={finding.evidence} />
        {finding.confidence ? <ConfidenceMeter level={finding.confidence} /> : null}
      </span>
    </>
  );
}

function TimelineCell({ finding }: { finding: TimelineFinding | undefined }) {
  if (!finding) return <span className="text-ink-faint">אין ניתוח לריל הזה.</span>;
  return (
    <ol className="space-y-1">
      {finding.beats.map((beat, index) => (
        <li key={index} className="flex gap-2">
          <span className="font-mono text-[0.7rem] text-ink-faint tabular-nums">{beat.at}</span>
          <span className="font-medium">{beat.label}</span>
        </li>
      ))}
    </ol>
  );
}

function PerformanceCell({ performance }: { performance: PerformanceIndex }) {
  if (!performance.available || performance.index === null) {
    return <p className="text-ink-faint">{performance.note}</p>;
  }
  return (
    <>
      <p className="font-mono text-lg tabular-nums">×{performance.index.toFixed(2)}</p>
      <p className="text-[0.78rem] text-ink-muted">{performance.note}</p>
      {performance.basis === "likesCount" ? (
        <p className="mt-1 text-[0.78rem] text-inferred">מבוסס לייקים — ודאות נמוכה.</p>
      ) : null}
    </>
  );
}

function SideHeader({ side, tag }: { side: ComparisonSideView; tag: string }) {
  return (
    <div>
      <p className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-ink-faint">{tag}</p>
      <h3 className="mt-0.5 font-display text-lg leading-tight">
        <Link href={`/reels/${side.reel.id}`} className="underline-offset-2 hover:underline">
          {side.reel.caption?.slice(0, 60) ?? side.reel.shortCode}
        </Link>
      </h3>
      <p className="mt-0.5 text-[0.75rem] text-ink-muted">
        {side.competitor.displayName} · {formatDate(side.reel.publishedAt)}
      </p>
      {side.analysisRunMode === "fixture" ? (
        <p className="mt-1 text-[0.72rem] text-inferred">ניתוח דוגמה, לא הרצת מודל.</p>
      ) : null}
    </div>
  );
}

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const aId = one(params, "a");
  const bId = one(params, "b");
  const savedId = one(params, "saved");

  const repos = await getReadyRepositories();
  const items = await repos.reels.list();
  const analysed = items.filter((item) => item.analysisStatus !== "none");

  const comparison = aId && bId ? await buildComparison(aId, bId) : null;

  const selector = (
    <form className="lab-card mb-6 grid gap-3 p-4 sm:grid-cols-[1fr_1fr_auto]">
      <div>
        <label className="lab-label" htmlFor="a">
          ריל א׳
        </label>
        <select id="a" name="a" className="lab-input" defaultValue={aId}>
          <option value="">בחרו ריל</option>
          {analysed.map((item) => (
            <option key={item.reel.id} value={item.reel.id}>
              {item.competitor.displayName} · {item.reel.shortCode}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="lab-label" htmlFor="b">
          ריל ב׳
        </label>
        <select id="b" name="b" className="lab-input" defaultValue={bId}>
          <option value="">בחרו ריל</option>
          {analysed.map((item) => (
            <option key={item.reel.id} value={item.reel.id}>
              {item.competitor.displayName} · {item.reel.shortCode}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-end">
        <button type="submit" className="lab-button">
          השוואה
        </button>
      </div>
    </form>
  );

  return (
    <>
      <PageHeader
        eyebrow="שלב 4"
        title="השוואת רילים"
        lede="שני רילים זה לצד זה, ולפני הכול — בדיקה אם בכלל מותר להשוות ביניהם. הבדל שנראה משמעותי הוא לרוב הבדל בתקופה, בנושא או בגודל הקהל."
      />

      {analysed.length < 2 ? (
        <EmptyState
          title="צריך שני רילים מנותחים"
          body="השוואה נשענת על ניתוח מבני של שני הצדדים. הריצו ניתוח לשני רילים לפחות, ואז חזרו לכאן."
          actionHref="/reels?analysisStatus=none"
          actionLabel="לרילים שטרם נותחו"
        />
      ) : (
        <>
          {selector}

          {savedId ? (
            <div className="mb-6">
              <Callout tone="note" title="ההשוואה נשמרה">
                אפשר עכשיו לשמור ממנה תבנית, והתבנית תצביע חזרה על ההשוואה הזו כראיה.
              </Callout>
            </div>
          ) : null}

          {comparison === null ? (
            <p className="text-sm text-ink-muted">בחרו שני רילים כדי להתחיל.</p>
          ) : !comparison.ok ? (
            <Callout tone="caution" title={comparison.error}>
              {comparison.hint}
            </Callout>
          ) : (
            (() => {
              const { left, right, verdict } = comparison.view;
              return (
                <div className="space-y-6">
                  <section
                    className={`lab-card p-5 ${verdict.level === "unsafe" ? "hatched" : ""}`}
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-3">
                      <h2 className="font-display text-lg">האם הרילים ברי־השוואה</h2>
                      <p className="font-mono text-[0.72rem] text-ink-muted">
                        {verdict.matches} תואמים · {verdict.mismatches} לא תואמים ·{" "}
                        {verdict.unknowns} לא ידועים
                      </p>
                    </div>

                    <p
                      className={`mt-2 text-[0.9rem] font-semibold ${
                        verdict.level === "reasonable" ? "text-measured" : "text-inferred"
                      }`}
                    >
                      {verdict.headline}
                    </p>

                    <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                      {verdict.checks.map((check) => (
                        <li key={check.key} className="flex gap-2 border-t border-rule pt-2">
                          <span
                            aria-hidden="true"
                            className={`mt-0.5 text-[0.7rem] ${STATUS_CLASS[check.status]}`}
                          >
                            {STATUS_MARK[check.status]}
                          </span>
                          <div>
                            <p className="text-[0.85rem] font-medium">
                              {check.question}{" "}
                              <span className={`text-[0.75rem] ${STATUS_CLASS[check.status]}`}>
                                {STATUS_LABEL[check.status]}
                              </span>
                            </p>
                            <p className="text-[0.78rem] leading-relaxed text-ink-muted">
                              {check.detail}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>

                    <p className="mt-4 border-t border-rule pt-3 text-[0.78rem] leading-relaxed text-ink-muted">
                      גם כשהכול תואם, זו עדיין תצפית ולא סיבתיות. מבנה שונה והפרש בביצועים הופיעו
                      יחד — זה לא אומר שהאחד גרם לשני.
                    </p>
                  </section>

                  <section className="lab-card p-5">
                    <div className="grid gap-4 border-b border-rule pb-4 md:grid-cols-2 md:gap-6">
                      <SideHeader side={left} tag="ריל א׳" />
                      <SideHeader side={right} tag="ריל ב׳" />
                    </div>

                    <CompareRow
                      label="מדדים ציבוריים"
                      left={<MetricsCell side={left} />}
                      right={<MetricsCell side={right} />}
                    />
                    <CompareRow
                      label="אורך"
                      left={
                        <span className="font-mono">{formatDuration(left.reel.durationSeconds)}</span>
                      }
                      right={
                        <span className="font-mono">
                          {formatDuration(right.reel.durationSeconds)}
                        </span>
                      }
                    />
                    <CompareRow
                      label="מדד ביצועים יחסי ליוצר"
                      left={<PerformanceCell performance={left.performance} />}
                      right={<PerformanceCell performance={right.performance} />}
                    />
                    <CompareRow
                      label="הוק מילולי"
                      left={<FindingCell finding={left.analysis?.verbalHook} />}
                      right={<FindingCell finding={right.analysis?.verbalHook} />}
                    />
                    <CompareRow
                      label="הוק ויזואלי"
                      left={<FindingCell finding={left.analysis?.visualHook} />}
                      right={<FindingCell finding={right.analysis?.visualHook} />}
                    />
                    <CompareRow
                      label="ההבטחה לצופה"
                      left={<FindingCell finding={left.analysis?.viewerPromise} />}
                      right={<FindingCell finding={right.analysis?.viewerPromise} />}
                    />
                    <CompareRow
                      label="לולאות פתוחות"
                      left={<ListCell finding={left.analysis?.openLoops} />}
                      right={<ListCell finding={right.analysis?.openLoops} />}
                    />
                    <CompareRow
                      label="מבנה הסיפור"
                      left={<TimelineCell finding={left.analysis?.structureTimeline} />}
                      right={<TimelineCell finding={right.analysis?.structureTimeline} />}
                    />
                    <CompareRow
                      label="אסקלציה"
                      left={<FindingCell finding={left.analysis?.escalation} />}
                      right={<FindingCell finding={right.analysis?.escalation} />}
                    />
                    <CompareRow
                      label="פייאוף"
                      left={<FindingCell finding={left.analysis?.payoff} />}
                      right={<FindingCell finding={right.analysis?.payoff} />}
                    />
                    <CompareRow
                      label="סגירה"
                      left={<FindingCell finding={left.analysis?.closing} />}
                      right={<FindingCell finding={right.analysis?.closing} />}
                    />
                    <CompareRow
                      label="לקח מבני להעברה"
                      left={<FindingCell finding={left.analysis?.transferableLesson} />}
                      right={<FindingCell finding={right.analysis?.transferableLesson} />}
                    />
                  </section>

                  <form action={saveComparisonAction} className="lab-card space-y-3 p-5">
                    <h2 className="font-display text-lg">שמירת ההשוואה</h2>
                    <input type="hidden" name="reelAId" value={left.reel.id} />
                    <input type="hidden" name="reelBId" value={right.reel.id} />
                    <div>
                      <label className="lab-label" htmlFor="notes">
                        הערות
                      </label>
                      <textarea
                        id="notes"
                        name="notes"
                        rows={2}
                        className="lab-input"
                        placeholder="מה בלט, ומה נשאר פתוח."
                      />
                    </div>
                    <button type="submit" className="lab-button lab-button-quiet">
                      שמירת ההשוואה
                    </button>
                  </form>

                  <PatternForm
                    supportingReelIds={[left.reel.id, right.reel.id]}
                    suggestedTitle=""
                  />
                </div>
              );
            })()
          )}
        </>
      )}
    </>
  );
}

function MetricsCell({ side }: { side: ComparisonSideView }) {
  return (
    <dl className="grid grid-cols-3 gap-2">
      <div>
        <dt className="text-[0.65rem] text-ink-faint">צפיות</dt>
        <dd
          className={`font-mono tabular-nums ${
            side.metrics?.playCount == null ? "text-ink-faint" : ""
          }`}
        >
          {formatCount(side.metrics?.playCount)}
        </dd>
      </div>
      <div>
        <dt className="text-[0.65rem] text-ink-faint">לייקים</dt>
        <dd className="font-mono tabular-nums">{formatCount(side.metrics?.likesCount)}</dd>
      </div>
      <div>
        <dt className="text-[0.65rem] text-ink-faint">תגובות</dt>
        <dd className="font-mono tabular-nums">{formatCount(side.metrics?.commentsCount)}</dd>
      </div>
    </dl>
  );
}
