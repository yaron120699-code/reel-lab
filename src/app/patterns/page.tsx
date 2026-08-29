import Link from "next/link";

import { deletePatternAction } from "@/app/actions";
import { ConfidenceMeter } from "@/components/evidence";
import { Callout, EmptyState, PageHeader, formatDate } from "@/components/ui";
import { getReadyRepositories } from "@/lib/demo/auto-seed";

export const dynamic = "force-dynamic";

export default async function PatternsPage() {
  const repos = await getReadyRepositories();
  const cards = await repos.patterns.list();

  const reelLabels = new Map<string, string>();
  for (const card of cards) {
    for (const reelId of card.supportingReelIds) {
      if (reelLabels.has(reelId)) continue;
      const reel = await repos.reels.findById(reelId);
      reelLabels.set(reelId, reel ? reel.shortCode : "ריל שהוסר");
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="שלב 5"
        title="ספריית תבניות"
        lede="מה למדנו, וכמה חזק זה נשען על משהו. כל תבנית נושאת את הראיות שלה, את מה שסותר אותה, ואת מה שאסור להעתיק."
      />

      {cards.length === 0 ? (
        <EmptyState
          title="אין עדיין תבניות"
          body="תבנית נשמרת מתוך השוואה בין שני רילים מנותחים. השוו שני רילים, ואז שמרו את הממצא כתבנית עם הראיות שלו."
          actionHref="/compare"
          actionLabel="לעמוד ההשוואה"
        />
      ) : (
        <div className="space-y-4">
          {cards.map((card) => (
            <article key={card.id} className="lab-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h2 className="font-display text-xl leading-tight">{card.title}</h2>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[0.72rem] text-ink-muted">
                    {card.evidenceCount} רילים מנותחים
                  </span>
                  <ConfidenceMeter level={card.confidence} />
                </div>
              </div>

              <p className="mt-2 text-[0.9rem] leading-relaxed">{card.description}</p>

              <dl className="mt-4 grid gap-4 border-t border-rule pt-4 sm:grid-cols-2">
                <div>
                  <dt className="text-[0.7rem] font-semibold text-ink-muted">מתי זה שימושי</dt>
                  <dd className="mt-0.5 text-[0.85rem] leading-relaxed">{card.whenUseful}</dd>
                </div>
                <div>
                  <dt className="text-[0.7rem] font-semibold text-inferred">
                    מה סותר או מה לא ידוע
                  </dt>
                  <dd className="mt-0.5 text-[0.85rem] leading-relaxed">{card.counterexamples}</dd>
                </div>
              </dl>

              <div className="mt-4 spine border-s-measured bg-measured-wash/40 px-4 py-3">
                <p className="text-[0.7rem] font-semibold text-measured">תרגום לבדרך</p>
                <p className="mt-0.5 text-[0.88rem] leading-relaxed">{card.baderechTranslation}</p>
              </div>

              <div className="mt-2 spine border-s-inferred bg-inferred-wash/40 px-4 py-3">
                <p className="text-[0.7rem] font-semibold text-inferred">לא להעתיק</p>
                <p className="mt-0.5 text-[0.88rem] leading-relaxed">{card.doNotCopyNote}</p>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-rule pt-3">
                <span className="text-[0.72rem] text-ink-faint">רילים תומכים:</span>
                {card.supportingReelIds.map((reelId) => (
                  <Link
                    key={reelId}
                    href={`/reels/${reelId}`}
                    className="rounded-[3px] border border-rule-strong bg-paper px-1.5 py-0.5 font-mono text-[0.7rem] text-ink-muted underline-offset-2 hover:underline"
                    dir="ltr"
                  >
                    {reelLabels.get(reelId) ?? reelId.slice(0, 8)}
                  </Link>
                ))}
                <span className="ms-auto font-mono text-[0.7rem] text-ink-faint">
                  {formatDate(card.createdAt)}
                </span>
                <form action={deletePatternAction}>
                  <input type="hidden" name="patternId" value={card.id} />
                  <button
                    type="submit"
                    className="text-[0.72rem] text-ink-faint underline underline-offset-2"
                  >
                    מחיקה
                  </button>
                </form>
              </div>
            </article>
          ))}

          <Callout tone="caution" title="תבנית היא היפותזה, לא כלל">
            ספירת הראיות סופרת רילים מנותחים בלבד. שני רילים הם התחלה של דפוס, לא הוכחה שלו —
            ולכן ודאות גבוהה נפתחת רק משלושה רילים מנותחים ומעלה.
          </Callout>
        </div>
      )}
    </>
  );
}
