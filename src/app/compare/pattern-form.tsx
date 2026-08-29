"use client";

import { useActionState } from "react";

import { savePatternAction } from "@/app/actions";
import { IDLE, type ActionState } from "@/lib/action-state";
import { FieldError, FormFeedback, SubmitButton } from "@/components/form";

export function PatternForm({
  supportingReelIds,
  suggestedTitle,
}: {
  supportingReelIds: string[];
  suggestedTitle: string;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(savePatternAction, IDLE);
  const errors = state.errors ?? {};

  return (
    <form action={formAction} className="lab-card space-y-4 p-5">
      <div>
        <h2 className="font-display text-lg">שמירת תבנית מההשוואה</h2>
        <p className="mt-1 text-[0.82rem] leading-relaxed text-ink-muted">
          תבנית היא המקום היחיד שבו ממצא הופך להמלצה, ולכן היא נושאת איתה את הראיות שלה. ספירת
          הראיות נגזרת מהרילים המנותחים התומכים — לא ממה שנכתב כאן.
        </p>
      </div>

      {supportingReelIds.map((reelId) => (
        <input key={reelId} type="hidden" name="supportingReelIds" value={reelId} />
      ))}

      <div>
        <label className="lab-label" htmlFor="title">
          כותרת התבנית
        </label>
        <input
          id="title"
          name="title"
          className="lab-input"
          defaultValue={suggestedTitle}
          placeholder="הקונפליקט המרכזי מופיע בחמש השניות הראשונות"
        />
        <FieldError message={errors.title} />
      </div>

      <div>
        <label className="lab-label" htmlFor="description">
          תיאור
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          className="lab-input"
          placeholder="מה בדיוק קורה במבנה, במילים שלכם."
        />
        <FieldError message={errors.description} />
      </div>

      <div>
        <label className="lab-label" htmlFor="whenUseful">
          מתי זה שימושי
        </label>
        <textarea
          id="whenUseful"
          name="whenUseful"
          rows={2}
          className="lab-input"
          placeholder="באיזה סוג סיפור זה עובד, ובאיזה לא."
        />
        <FieldError message={errors.whenUseful} />
      </div>

      <div>
        <label className="lab-label" htmlFor="counterexamples">
          מה סותר או מה עדיין לא ידוע
        </label>
        <textarea
          id="counterexamples"
          name="counterexamples"
          rows={2}
          className="lab-input"
          placeholder="מדגם קטן, הבדלי נושא, תקופות שונות."
        />
        <FieldError message={errors.counterexamples} />
      </div>

      <div>
        <label className="lab-label" htmlFor="confidence">
          ודאות מבוקשת
        </label>
        <select id="confidence" name="confidence" className="lab-input" defaultValue="low">
          <option value="low">נמוכה</option>
          <option value="medium">בינונית</option>
          <option value="high">גבוהה</option>
        </select>
        <p className="mt-1 text-[0.72rem] text-ink-faint">
          ודאות גבוהה דורשת שלושה רילים מנותחים תומכים לפחות. אחרת היא תרד אוטומטית.
        </p>
        <FieldError message={errors.confidence} />
      </div>

      <div>
        <label className="lab-label" htmlFor="baderechTranslation">
          תרגום לבדרך
        </label>
        <textarea
          id="baderechTranslation"
          name="baderechTranslation"
          rows={3}
          className="lab-input"
          placeholder="לפתוח באירוע קונקרטי או בסתירה לא פתורה, בלי להעתיק ניסוח, פרסונה או זהות."
        />
        <FieldError message={errors.baderechTranslation} />
      </div>

      <div>
        <label className="lab-label" htmlFor="doNotCopyNote">
          מה אסור להעתיק
        </label>
        <textarea
          id="doNotCopyNote"
          name="doNotCopyNote"
          rows={2}
          className="lab-input"
          placeholder="ניסוח מדויק, שם, פרסונה, סגנון דיבור, מקומות ספציפיים."
        />
        <FieldError message={errors.doNotCopyNote} />
      </div>

      <FormFeedback state={state} />

      <SubmitButton pendingLabel="שומר תבנית…">שמירת תבנית</SubmitButton>
    </form>
  );
}
