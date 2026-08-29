/**
 * Shown only where the dataset is rebuilt per instance and thrown away with it.
 * Anyone adding a competitor or importing a reel on a deployment like this
 * deserves to know up front that their work will not be there later.
 */
export function DemoBanner({ show }: { show: boolean }) {
  if (!show) return null;

  return (
    <div
      role="status"
      className="hatched border-b border-inferred/30 bg-inferred-wash/70 px-5 py-2 text-center sm:px-8"
    >
      <p className="text-[0.82rem] font-semibold text-inferred">
        מצב תצוגה — נתוני הדמו זמניים ואינם נשמרים
      </p>
      <p className="mt-0.5 text-[0.75rem] text-ink-muted">
        כל מה שתוסיפו כאן ייעלם. להרצה אמיתית עם שמירה, הריצו את הכלי מקומית.
      </p>
    </div>
  );
}
