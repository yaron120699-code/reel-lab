"use client";

import { useActionState, useState } from "react";

import {
  attachVideoAction,
  fetchApifyDatasetAction,
  importApifyAction,
  importReelUrlAction,
} from "@/app/actions";
import { IDLE, type ActionState } from "@/lib/action-state";
import { FieldError, FormFeedback, SubmitButton } from "@/components/form";

type CompetitorOption = { id: string; displayName: string; instagramUsername: string };
type ReelOption = { id: string; label: string; hasVideo: boolean };

export function ReelUrlForm({ configured }: { configured: boolean }) {
  const [state, formAction] = useActionState<ActionState, FormData>(importReelUrlAction, IDLE);
  const errors = state.errors ?? {};

  return (
    <form action={formAction} className="lab-card space-y-4 p-5">
      <div>
        <h2 className="font-display text-lg">ייבוא וניתוח מקישור</h2>
        <p className="mt-1 text-[0.82rem] leading-relaxed text-ink-muted">
          מדביקים קישור לריל ציבורי. המערכת מזהה את היוצר, מושכת נתונים ותמלול מ-Apify
          ומריצה ניתוח אוטומטי. היוצר צריך להופיע כבר ברשימת היוצרים.
        </p>
      </div>

      <div>
        <label className="lab-label" htmlFor="reelUrl">
          קישור לריל
        </label>
        <input
          id="reelUrl"
          name="url"
          type="url"
          dir="ltr"
          className="lab-input"
          placeholder="https://www.instagram.com/reel/…/"
          disabled={!configured}
        />
        <FieldError message={errors.url} />
      </div>

      {!configured ? (
        <p className="text-[0.78rem] text-inferred">
          צריך להגדיר APIFY_API_TOKEN בקובץ .env ולהפעיל מחדש את השרת.
        </p>
      ) : null}

      <FormFeedback state={state} />

      <SubmitButton pendingLabel="מושך ומנתח…" disabled={!configured}>
        ייבוא וניתוח
      </SubmitButton>
    </form>
  );
}

function CompetitorSelect({
  competitors,
  error,
  id = "competitorId",
}: {
  competitors: CompetitorOption[];
  error?: string;
  id?: string;
}) {
  return (
    <div>
      <label className="lab-label" htmlFor={id}>
        יוצר
      </label>
      <select id={id} name="competitorId" className="lab-input" defaultValue="">
        <option value="" disabled>
          בחרו יוצר
        </option>
        {competitors.map((competitor) => (
          <option key={competitor.id} value={competitor.id}>
            {competitor.displayName} (@{competitor.instagramUsername})
          </option>
        ))}
      </select>
      <FieldError message={error} />
    </div>
  );
}

export function ApifyJsonForm({
  competitors,
  sampleJson,
}: {
  competitors: CompetitorOption[];
  sampleJson: string;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(importApifyAction, IDLE);
  const [json, setJson] = useState("");
  const errors = state.errors ?? {};

  return (
    <form action={formAction} className="lab-card space-y-4 p-5">
      <div>
        <h2 className="font-display text-lg">1 · הדבקת תוצאת Apify</h2>
        <p className="mt-1 text-[0.82rem] leading-relaxed text-ink-muted">
          מדביקים את ה-JSON כפי שהוא: פריט בודד, מערך פריטים, או אובייקט עם{" "}
          <span className="font-mono">items</span>. שדה שחסר בייבוא נשאר חסר ולא הופך לאפס.
        </p>
      </div>

      <CompetitorSelect competitors={competitors} error={errors.competitorId} />

      <div>
        <div className="flex items-end justify-between gap-2">
          <label className="lab-label" htmlFor="json">
            תוצאת Apify (JSON)
          </label>
          <button
            type="button"
            onClick={() => setJson(sampleJson)}
            className="mb-1 text-[0.72rem] text-ink-muted underline underline-offset-2"
          >
            מילוי בדוגמה
          </button>
        </div>
        <textarea
          id="json"
          name="json"
          rows={12}
          dir="ltr"
          className="lab-input font-mono text-[0.75rem]"
          value={json}
          onChange={(event) => setJson(event.target.value)}
          placeholder={'[\n  {\n    "url": "https://www.instagram.com/reel/…",\n    "shortCode": "…"\n  }\n]'}
        />
        <FieldError message={errors.json} />
      </div>

      <div>
        <label className="lab-label" htmlFor="tags">
          תגיות לכל הרילים בייבוא הזה
        </label>
        <input id="tags" name="tags" className="lab-input" placeholder="מסע, הוק חזק" />
        <FieldError message={errors.tags} />
      </div>

      <FormFeedback state={state} />

      <SubmitButton pendingLabel="מייבא…">ייבוא</SubmitButton>
    </form>
  );
}

export function AttachVideoForm({ reels }: { reels: ReelOption[] }) {
  const [state, formAction] = useActionState<ActionState, FormData>(attachVideoAction, IDLE);
  const errors = state.errors ?? {};

  return (
    <form action={formAction} className="lab-card space-y-4 p-5">
      <div>
        <h2 className="font-display text-lg">2 · צירוף קובץ MP4</h2>
        <p className="mt-1 text-[0.82rem] leading-relaxed text-ink-muted">
          מורידים את הסרטון בנפרד ומצרפים אותו לריל. הקובץ נשמר בתיקייה מקומית שמוחרגת מ-git
          ואינו נשלח לשום מקום.
        </p>
      </div>

      <div>
        <label className="lab-label" htmlFor="reelId">
          ריל
        </label>
        <select id="reelId" name="reelId" className="lab-input" defaultValue="">
          <option value="" disabled>
            בחרו ריל
          </option>
          {reels.map((reel) => (
            <option key={reel.id} value={reel.id}>
              {reel.hasVideo ? "✓ " : ""}
              {reel.label}
            </option>
          ))}
        </select>
        <FieldError message={errors.reelId} />
      </div>

      <div>
        <label className="lab-label" htmlFor="file">
          קובץ וידאו
        </label>
        <input
          id="file"
          name="file"
          type="file"
          accept="video/mp4,video/quicktime"
          className="lab-input"
        />
        <p className="mt-1 text-[0.72rem] text-ink-faint">MP4 או MOV, עד 200MB.</p>
        <FieldError message={errors.file} />
      </div>

      <FormFeedback state={state} />

      <SubmitButton pendingLabel="מעלה…" disabled={reels.length === 0}>
        צירוף לריל
      </SubmitButton>
    </form>
  );
}

export function ApifyDatasetForm({
  competitors,
  configured,
}: {
  competitors: CompetitorOption[];
  configured: boolean;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(fetchApifyDatasetAction, IDLE);
  const errors = state.errors ?? {};

  return (
    <form action={formAction} className="lab-card space-y-4 p-5">
      <div>
        <h2 className="font-display text-lg">משיכה ישירה מ-Apify (אופציונלי)</h2>
        <p className="mt-1 text-[0.82rem] leading-relaxed text-ink-muted">
          {configured
            ? "טוקן מוגדר בצד השרת. הוא נקרא רק שם, לא מוצג כאן ולא נכתב ללוגים."
            : "לא הוגדר APIFY_API_TOKEN. הזרימה הידנית למעלה עובדת במלואה בלי טוקן — זו הדרך הנתמכת."}
        </p>
      </div>

      <CompetitorSelect
        competitors={competitors}
        error={errors.competitorId}
        id="apifyCompetitorId"
      />

      <div>
        <label className="lab-label" htmlFor="datasetId">
          מזהה dataset
        </label>
        <input
          id="datasetId"
          name="datasetId"
          dir="ltr"
          className="lab-input font-mono"
          placeholder="aBcD1234efGh5678"
          disabled={!configured}
        />
        <FieldError message={errors.datasetId} />
      </div>

      <FormFeedback state={state} />

      <SubmitButton pendingLabel="מושך…" quiet disabled={!configured}>
        משיכה וייבוא
      </SubmitButton>
    </form>
  );
}
