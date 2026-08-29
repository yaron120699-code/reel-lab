import Link from "next/link";

import { deleteCompetitorAction } from "@/app/actions";
import { Callout, EmptyState, PageHeader, Stat, Tag, formatCount, formatDate } from "@/components/ui";
import { getReadyRepositories } from "@/lib/demo/auto-seed";
import { COUNTRY_LABELS } from "@/lib/validation/forms";

import { CompetitorForm, DemoSeedButton } from "./competitor-form";

export const dynamic = "force-dynamic";

export default async function CompetitorsPage() {
  const repos = await getReadyRepositories();
  const competitors = await repos.competitors.list();
  const stats = await repos.reels.statsByCompetitor();
  const statsById = new Map(stats.map((entry) => [entry.competitorId, entry]));

  return (
    <>
      <PageHeader
        eyebrow="שלב 1"
        title="יוצרים"
        lede="מי נמצא במעבדה, כמה חומר יש עליו, וכמה ממנו כבר נותח. הכול כאן הוא חומר גלם למחקר מבני — לא מודל לחיקוי."
      />

      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <section className="space-y-4">
          {competitors.length === 0 ? (
            <EmptyState
              title="אין עדיין יוצרים במעבדה"
              body="הוסיפו יוצר בטופס שלצד העמוד, או טענו נתוני דמו כדי לעבור על כל הזרימה — ייבוא, ניתוח, השוואה ותבנית — בלי שום חיבור חיצוני."
            >
              <DemoSeedButton quiet />
            </EmptyState>
          ) : (
            competitors.map((competitor) => {
              const stat = statsById.get(competitor.id);
              const enoughMetrics = (stat?.reelsWithPlayCount ?? 0) >= 3;

              return (
                <article key={competitor.id} className="lab-card p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="font-display text-xl leading-tight">
                        {competitor.displayName}
                      </h2>
                      <p className="mt-0.5 font-mono text-[0.78rem] text-ink-muted" dir="ltr">
                        @{competitor.instagramUsername}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-[0.72rem] text-ink-muted">
                      <Tag>{COUNTRY_LABELS[competitor.country]}</Tag>
                      <Tag>{competitor.niche}</Tag>
                    </div>
                  </div>

                  <p className="mt-3 text-[0.88rem] leading-relaxed text-ink-muted">
                    {competitor.relevanceNote}
                  </p>

                  {competitor.tags.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {competitor.tags.map((tag) => (
                        <Tag key={tag}>{tag}</Tag>
                      ))}
                    </div>
                  ) : null}

                  <div className="mt-4 grid grid-cols-2 gap-4 border-t border-rule pt-4 sm:grid-cols-4">
                    <Stat label="רילים שיובאו" value={formatCount(stat?.importedReels ?? 0)} />
                    <Stat label="רילים שנותחו" value={formatCount(stat?.analysedReels ?? 0)} />
                    <Stat
                      label="חציון צפיות"
                      value={enoughMetrics ? formatCount(stat?.medianPlayCount ?? null) : "—"}
                      hint={
                        enoughMetrics
                          ? `על בסיס ${stat?.reelsWithPlayCount} רילים`
                          : "צריך 3 רילים עם צפיות"
                      }
                      muted={!enoughMetrics}
                    />
                    <Stat
                      label="טווח פרסום"
                      value={
                        stat?.earliestPublishedAt
                          ? `${formatDate(stat.earliestPublishedAt).slice(0, 12)}`
                          : "—"
                      }
                      hint={stat?.latestPublishedAt ? `עד ${formatDate(stat.latestPublishedAt)}` : undefined}
                      muted={!stat?.earliestPublishedAt}
                    />
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <Link href={`/reels?competitorId=${competitor.id}`} className="lab-button">
                      ספריית הרילים שלו
                    </Link>
                    <a
                      href={competitor.profileUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="lab-button lab-button-quiet"
                    >
                      פרופיל מקורי
                    </a>
                    <form action={deleteCompetitorAction} className="ms-auto">
                      <input type="hidden" name="competitorId" value={competitor.id} />
                      <button
                        type="submit"
                        className="text-[0.75rem] text-ink-faint underline underline-offset-2"
                      >
                        הסרה מהמעבדה
                      </button>
                    </form>
                  </div>
                </article>
              );
            })
          )}

          {competitors.length > 0 ? (
            <Callout tone="caution" title="סיכום הביצועים כאן הוא תיאורי בלבד">
              חציון הצפיות מתאר את מה שיובא, לא את מה שהיוצר באמת מקבל. ייבוא חלקי, תקופות שונות
              ושינויים בהפצה משפיעים על המספר הזה יותר מאשר איכות הריל.
            </Callout>
          ) : null}
        </section>

        <aside className="space-y-4">
          <CompetitorForm />
          {competitors.length > 0 ? (
            <div className="lab-card p-5">
              <h2 className="font-display text-base">נתוני דמו</h2>
              <p className="mt-1 mb-3 text-[0.8rem] text-ink-muted">
                טוענים יוצר לדוגמה, שישה רילים, שני ניתוחי דוגמה מסומנים וקובצי וידאו מקומיים.
                אפשר להריץ שוב — הנתונים מתרעננים ולא מוכפלים.
              </p>
              <DemoSeedButton quiet />
            </div>
          ) : null}
        </aside>
      </div>
    </>
  );
}
