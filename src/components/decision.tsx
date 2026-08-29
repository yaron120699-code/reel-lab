import type { PerformanceBand, PerformanceLabel } from "@/lib/compare/performance-label";

/**
 * Performance is not evidence about the reel's craft, so it does not borrow the
 * measured/observed/inferred palette. It gets neutral ink weights instead, with
 * a single ochre note when the reading rests on likes rather than views.
 */
const BAND_CLASS: Record<PerformanceBand, string> = {
  strong: "border-ink bg-ink text-paper",
  typical: "border-rule-strong bg-paper text-ink",
  weak: "border-rule-strong bg-paper-sunken text-ink-muted",
  unknown: "border-dashed border-rule-strong bg-paper text-ink-faint",
};

export function PerformanceBadge({
  performance,
  showIndex = true,
}: {
  performance: PerformanceLabel;
  showIndex?: boolean;
}) {
  return (
    <span
      title={performance.caveat}
      className={`inline-flex items-center gap-1.5 rounded-[3px] border px-2 py-0.5 text-[0.72rem] font-medium ${BAND_CLASS[performance.band]}`}
    >
      <span>{performance.label}</span>
      {showIndex && performance.index !== null ? (
        <span dir="ltr" className="font-mono tabular-nums opacity-80">
          ×{performance.index.toFixed(2)}
        </span>
      ) : null}
    </span>
  );
}

/**
 * Native disclosure. Research detail stays on the page in full — it just stops
 * standing between the reader and the decision.
 */
export function Disclosure({
  title,
  hint,
  children,
  defaultOpen = false,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details open={defaultOpen} className="lab-card group">
      <summary className="flex cursor-pointer list-none items-baseline justify-between gap-3 px-4 py-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink">
        <span>
          <span className="font-display text-[1rem]">{title}</span>
          {hint ? <span className="ms-2 text-[0.75rem] text-ink-muted">{hint}</span> : null}
        </span>
        <span
          aria-hidden="true"
          className="font-mono text-[0.75rem] text-ink-faint transition-transform group-open:rotate-90"
        >
          ‹
        </span>
      </summary>
      <div className="border-t border-rule px-4 py-4">{children}</div>
    </details>
  );
}

/**
 * Wraps an inferred conclusion so it always reads as a hypothesis under test,
 * not as a finding. Used wherever the summary surfaces an interpretation.
 */
export function WorkingHypothesis({ children }: { children: React.ReactNode }) {
  return (
    <div className="spine border-s-inferred bg-inferred-wash/45 px-4 py-3">
      <p className="text-[0.72rem] font-semibold text-inferred">היפותזת העבודה · מוסק</p>
      <div className="mt-1 text-[0.92rem] leading-relaxed">{children}</div>
    </div>
  );
}
