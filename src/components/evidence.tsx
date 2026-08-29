import {
  CONFIDENCE_LABELS,
  EVIDENCE_DESCRIPTIONS,
  EVIDENCE_KINDS,
  EVIDENCE_LABELS,
  type ConfidenceLevel,
  type EvidenceKind,
  type EvidenceLedger,
  type Finding,
  type ListFinding,
  type TimelineFinding,
} from "@/lib/analysis/schema";

const CHIP_CLASS: Record<EvidenceKind, string> = {
  measured: "bg-measured-wash text-measured border-measured/30",
  observed: "bg-observed-wash text-observed border-observed/30",
  inferred: "bg-inferred-wash text-inferred border-inferred/30",
};

const SPINE_CLASS: Record<EvidenceKind, string> = {
  measured: "border-s-measured",
  observed: "border-s-observed",
  inferred: "border-s-inferred",
};

const BAR_CLASS: Record<EvidenceKind, string> = {
  measured: "bg-measured",
  observed: "bg-observed",
  inferred: "bg-inferred",
};

export function EvidenceChip({ kind }: { kind: EvidenceKind }) {
  return (
    <span
      title={EVIDENCE_DESCRIPTIONS[kind]}
      className={`inline-flex items-center rounded-[3px] border px-1.5 py-0.5 font-mono text-[0.65rem] font-medium ${CHIP_CLASS[kind]}`}
    >
      {EVIDENCE_LABELS[kind]}
    </span>
  );
}

export function ConfidenceMeter({ level }: { level: ConfidenceLevel }) {
  const filled = level === "low" ? 1 : level === "medium" ? 2 : 3;
  return (
    <span className="inline-flex items-center gap-1 text-[0.65rem] text-inferred">
      <span className="flex gap-0.5" aria-hidden="true">
        {[0, 1, 2].map((index) => (
          <span
            key={index}
            className={`block h-2.5 w-1.5 rounded-[1px] ${
              index < filled ? "bg-inferred" : "bg-inferred/20"
            }`}
          />
        ))}
      </span>
      <span>ודאות {CONFIDENCE_LABELS[level]}</span>
    </span>
  );
}

export function EvidenceLegend() {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
      {EVIDENCE_KINDS.map((kind) => (
        <li key={kind} className="flex items-center gap-1.5 text-[0.72rem] text-ink-muted">
          <EvidenceChip kind={kind} />
          <span>{EVIDENCE_DESCRIPTIONS[kind]}</span>
        </li>
      ))}
    </ul>
  );
}

/** How much of an analysis is data, how much is sight, how much is guesswork. */
export function EvidenceLedgerBar({ ledger }: { ledger: EvidenceLedger }) {
  if (ledger.total === 0) return null;

  return (
    <div>
      <div className="flex h-2 w-full overflow-hidden rounded-[2px] bg-paper-sunken">
        {EVIDENCE_KINDS.map((kind) =>
          ledger[kind] === 0 ? null : (
            <div
              key={kind}
              className={BAR_CLASS[kind]}
              style={{ width: `${(ledger[kind] / ledger.total) * 100}%` }}
            />
          ),
        )}
      </div>
      <p className="mt-1.5 text-[0.72rem] text-ink-muted">
        מתוך {ledger.total} שדות:{" "}
        <span className="text-measured">{ledger.measured} נמדדו</span>,{" "}
        <span className="text-observed">{ledger.observed} נצפו</span>,{" "}
        <span className="text-inferred">{ledger.inferred} מוסקים</span>.
      </p>
    </div>
  );
}

function EvidenceMeta({
  evidence,
  confidence,
  sourceField,
  note,
}: {
  evidence: EvidenceKind;
  confidence?: ConfidenceLevel;
  sourceField?: string;
  note?: string;
}) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
      <EvidenceChip kind={evidence} />
      {confidence ? <ConfidenceMeter level={confidence} /> : null}
      {sourceField ? (
        <span className="font-mono text-[0.68rem] text-measured">מקור: {sourceField}</span>
      ) : null}
      {note ? <span className="text-[0.72rem] text-ink-faint">{note}</span> : null}
    </div>
  );
}

export function FindingRow({ label, finding }: { label: string; finding: Finding }) {
  return (
    <article className={`spine ${SPINE_CLASS[finding.evidence]} bg-paper-raised px-4 py-3`}>
      <h3 className="font-display text-[0.95rem] text-ink-muted">{label}</h3>
      <p className="mt-1 text-[0.95rem] leading-relaxed">{finding.value}</p>
      <EvidenceMeta {...finding} />
    </article>
  );
}

export function ListFindingRow({ label, finding }: { label: string; finding: ListFinding }) {
  return (
    <article className={`spine ${SPINE_CLASS[finding.evidence]} bg-paper-raised px-4 py-3`}>
      <h3 className="font-display text-[0.95rem] text-ink-muted">{label}</h3>
      {finding.items.length === 0 ? (
        <p className="mt-1 text-[0.9rem] text-ink-faint">לא נמצא פריט אחד.</p>
      ) : (
        <ul className="mt-1 space-y-1">
          {finding.items.map((item, index) => (
            <li key={index} className="flex gap-2 text-[0.95rem] leading-relaxed">
              <span aria-hidden="true" className="text-ink-faint">
                ·
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
      <EvidenceMeta {...finding} />
    </article>
  );
}

export function TimelineFindingRow({
  label,
  finding,
}: {
  label: string;
  finding: TimelineFinding;
}) {
  return (
    <article className={`spine ${SPINE_CLASS[finding.evidence]} bg-paper-raised px-4 py-3`}>
      <h3 className="font-display text-[0.95rem] text-ink-muted">{label}</h3>
      <ol className="mt-2 space-y-2">
        {finding.beats.map((beat, index) => (
          <li key={index} className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
            <span className="font-mono text-[0.72rem] text-ink-faint tabular-nums">{beat.at}</span>
            <span className="text-[0.9rem] font-semibold">{beat.label}</span>
            <span />
            <span className="text-[0.88rem] leading-relaxed text-ink-muted">
              {beat.description}
            </span>
          </li>
        ))}
      </ol>
      <EvidenceMeta {...finding} />
    </article>
  );
}
