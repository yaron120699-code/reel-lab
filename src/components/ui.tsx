import Link from "next/link";

export function PageHeader({
  eyebrow,
  title,
  lede,
  actions,
}: {
  eyebrow: string;
  title: string;
  lede?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="mb-8 border-b border-rule pb-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-ink-faint">
            {eyebrow}
          </p>
          <h1 className="mt-1 font-display text-3xl leading-tight">{title}</h1>
          {lede ? <p className="mt-2 max-w-2xl text-sm text-ink-muted">{lede}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}

type CalloutTone = "note" | "warning" | "caution";

const TONE_CLASS: Record<CalloutTone, string> = {
  note: "border-s-observed bg-observed-wash/50",
  caution: "border-s-inferred bg-inferred-wash/50",
  warning: "border-s-inferred bg-inferred-wash/60 hatched",
};

export function Callout({
  tone = "note",
  title,
  children,
}: {
  tone?: CalloutTone;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={`spine rounded-[4px] px-4 py-3 ${TONE_CLASS[tone]}`}>
      <p className="text-sm font-semibold">{title}</p>
      {children ? <div className="mt-1 text-[0.85rem] leading-relaxed">{children}</div> : null}
    </div>
  );
}

/** Empty screens say what to do next, and link to the place to do it. */
export function EmptyState({
  title,
  body,
  actionHref,
  actionLabel,
  children,
}: {
  title: string;
  body: string;
  actionHref?: string;
  actionLabel?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="lab-card px-6 py-10 text-center">
      <h2 className="font-display text-xl">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-muted">{body}</p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        {actionHref && actionLabel ? (
          <Link href={actionHref} className="lab-button">
            {actionLabel}
          </Link>
        ) : null}
        {children}
      </div>
    </div>
  );
}

export function Stat({
  label,
  value,
  hint,
  muted,
}: {
  label: string;
  value: string;
  hint?: string;
  muted?: boolean;
}) {
  return (
    <div>
      <p className="text-[0.7rem] text-ink-faint">{label}</p>
      <p
        className={`font-mono text-lg tabular-nums ${muted ? "text-ink-faint" : "text-ink"}`}
      >
        {value}
      </p>
      {hint ? <p className="text-[0.68rem] text-ink-faint">{hint}</p> : null}
    </div>
  );
}

export function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-[3px] border border-rule-strong bg-paper px-1.5 py-0.5 text-[0.7rem] text-ink-muted">
      {children}
    </span>
  );
}

/* --------------------------------- format -------------------------------- */

export function formatCount(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("he-IL").format(value);
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("he-IL", { dateStyle: "medium" }).format(date);
}

export function formatDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined) return "—";
  const whole = Math.round(seconds);
  const minutes = Math.floor(whole / 60);
  const rest = whole % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}
