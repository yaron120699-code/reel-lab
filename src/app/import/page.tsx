import { Callout, EmptyState, PageHeader } from "@/components/ui";
import { publicRuntimeFlags } from "@/lib/config/env";
import { DEMO_APIFY_JSON } from "@/lib/demo/data";
import { getReadyRepositories } from "@/lib/demo/auto-seed";

import { ApifyDatasetForm, ApifyJsonForm, AttachVideoForm } from "./import-forms";

export const dynamic = "force-dynamic";

const NORMALIZED_FIELDS = [
  "url",
  "shortCode",
  "caption",
  "timestamp",
  "videoDuration",
  "videoPlayCount",
  "likesCount",
  "commentsCount",
  "transcript",
  "videoUrl",
  "displayUrl",
  "ownerUsername",
];

export default async function ImportPage() {
  const repos = await getReadyRepositories();
  const flags = publicRuntimeFlags();

  const [competitors, reelItems] = await Promise.all([
    repos.competitors.list(),
    repos.reels.list(),
  ]);

  const competitorOptions = competitors.map((competitor) => ({
    id: competitor.id,
    displayName: competitor.displayName,
    instagramUsername: competitor.instagramUsername,
  }));

  const reelOptions = reelItems.map((item) => ({
    id: item.reel.id,
    label: `${item.competitor.displayName} · ${item.reel.shortCode}`,
    hasVideo: item.hasVideoFile,
  }));

  return (
    <>
      <PageHeader
        eyebrow="שלב 3"
        title="ייבוא ריל"
        lede="הזרימה הידנית היא הזרימה הראשית: מדביקים JSON, מצרפים MP4, מקשרים ליוצר. אין תלות בשום מפתח חיצוני."
      />

      {competitors.length === 0 ? (
        <EmptyState
          title="צריך יוצר לפני ייבוא"
          body="לכל ריל יש בעלים במעבדה, כדי שאפשר יהיה להשוות אותו לרילים אחרים של אותו יוצר. הוסיפו יוצר אחד ואז חזרו לכאן."
          actionHref="/competitors"
          actionLabel="להוספת יוצר"
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <ApifyJsonForm competitors={competitorOptions} sampleJson={DEMO_APIFY_JSON} />
            <ApifyDatasetForm
              competitors={competitorOptions}
              configured={flags.apifyConfigured}
            />
          </div>

          <div className="space-y-6">
            <AttachVideoForm reels={reelOptions} />

            <section className="lab-card p-5">
              <h2 className="font-display text-lg">מה מנורמל מה-JSON</h2>
              <p className="mt-1 text-[0.82rem] leading-relaxed text-ink-muted">
                השדות האלה נקראים ונשמרים יחד עם שם השדה שממנו הגיע כל ערך, כדי שבניתוח אפשר יהיה
                לסמן אותו כנמדד ולהצביע על המקור.
              </p>
              <ul className="mt-3 flex flex-wrap gap-1.5" dir="ltr">
                {NORMALIZED_FIELDS.map((field) => (
                  <li
                    key={field}
                    className="rounded-[3px] border border-rule-strong bg-paper px-1.5 py-0.5 font-mono text-[0.7rem] text-ink-muted"
                  >
                    {field}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[0.78rem] leading-relaxed text-ink-muted">
                ה-JSON המקורי נשמר כפי שהוא לצד הריל, כך שאפשר תמיד לחזור למקור ולבדוק מאיפה הגיע
                כל מספר.
              </p>
            </section>

            <Callout tone="note" title="הסרטונים נשארים אצלכם">
              קובצי הווידאו נשמרים בתיקייה מקומית שמוחרגת מ-git, ביחד עם בסיס הנתונים. אין העלאה
              לשירות חיצוני, ואין שמירה של הקבצים במאגר הקוד.
            </Callout>
          </div>
        </div>
      )}
    </>
  );
}
