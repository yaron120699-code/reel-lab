"use client";

import { useActionState } from "react";

import { createCompetitorAction, seedDemoAction } from "@/app/actions";
import { IDLE, type ActionState } from "@/lib/action-state";
import { FieldError, FormFeedback, SubmitButton } from "@/components/form";
import { COUNTRY_LABELS } from "@/lib/validation/forms";

export function CompetitorForm() {
  const [state, formAction] = useActionState<ActionState, FormData>(
    createCompetitorAction,
    IDLE,
  );

  const errors = state.errors ?? {};

  return (
    <form action={formAction} className="lab-card space-y-4 p-5">
      <div>
        <h2 className="font-display text-lg">הוספת יוצר</h2>
        <p className="mt-1 text-[0.8rem] text-ink-muted">
          כל שדה כאן הוא החלטת מחקר: למה דווקא היוצר הזה, ומה אנחנו מצפים ללמוד ממנו.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="lab-label" htmlFor="displayName">
            שם תצוגה
          </label>
          <input id="displayName" name="displayName" className="lab-input" placeholder="ליאור נבון" />
          <FieldError message={errors.displayName} />
        </div>

        <div>
          <label className="lab-label" htmlFor="instagramUsername">
            שם משתמש באינסטגרם
          </label>
          <input
            id="instagramUsername"
            name="instagramUsername"
            className="lab-input font-mono"
            dir="ltr"
            placeholder="lior.navon"
          />
          <FieldError message={errors.instagramUsername} />
        </div>
      </div>

      <div>
        <label className="lab-label" htmlFor="profileUrl">
          כתובת הפרופיל
        </label>
        <input
          id="profileUrl"
          name="profileUrl"
          className="lab-input font-mono"
          dir="ltr"
          placeholder="https://www.instagram.com/lior.navon/"
        />
        <FieldError message={errors.profileUrl} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="lab-label" htmlFor="country">
            מדינה
          </label>
          <select id="country" name="country" className="lab-input" defaultValue="IL">
            {Object.entries(COUNTRY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <FieldError message={errors.country} />
        </div>

        <div>
          <label className="lab-label" htmlFor="niche">
            נישה
          </label>
          <input id="niche" name="niche" className="lab-input" placeholder="סיפורי דרך וטיולים" />
          <FieldError message={errors.niche} />
        </div>
      </div>

      <div>
        <label className="lab-label" htmlFor="relevanceNote">
          למה היוצר הזה רלוונטי
        </label>
        <textarea
          id="relevanceNote"
          name="relevanceNote"
          rows={3}
          className="lab-input"
          placeholder="קהל חופף, אותו אורך ריל, מבנה סיפור שאנחנו רוצים להבין."
        />
        <FieldError message={errors.relevanceNote} />
      </div>

      <div>
        <label className="lab-label" htmlFor="tags">
          תגיות
        </label>
        <input id="tags" name="tags" className="lab-input" placeholder="מסע, עברית, סיפור" />
        <p className="mt-1 text-[0.72rem] text-ink-faint">מופרדות בפסיקים.</p>
        <FieldError message={errors.tags} />
      </div>

      <FormFeedback state={state} />

      <SubmitButton pendingLabel="שומר…">הוספת יוצר</SubmitButton>
    </form>
  );
}

export function DemoSeedButton({ quiet }: { quiet?: boolean }) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    async (prev) => seedDemoAction(prev),
    IDLE,
  );

  return (
    <form action={formAction} className="space-y-2">
      <SubmitButton pendingLabel="טוען נתוני דמו…" quiet={quiet}>
        טעינת נתוני דמו
      </SubmitButton>
      <FormFeedback state={state} />
    </form>
  );
}
