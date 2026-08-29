"use client";

import { useFormStatus } from "react-dom";

import type { ActionState } from "@/lib/action-state";

export function SubmitButton({
  children,
  pendingLabel,
  quiet,
  disabled,
}: {
  children: React.ReactNode;
  pendingLabel: string;
  quiet?: boolean;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className={`lab-button ${quiet ? "lab-button-quiet" : ""}`}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-[0.75rem] text-inferred">{message}</p>;
}

/** Success and failure use the same block, so neither can be missed. */
export function FormFeedback({ state }: { state: ActionState }) {
  if (state.status === "idle" || state.message === "") return null;

  const failed = state.status === "error";
  return (
    <div
      role="status"
      className={`spine rounded-[4px] px-3 py-2 text-[0.85rem] ${
        failed ? "border-s-inferred bg-inferred-wash/60" : "border-s-measured bg-measured-wash/60"
      }`}
    >
      <p className="font-semibold">{state.message}</p>
      {state.detail ? <p className="mt-0.5 text-ink-muted">{state.detail}</p> : null}
    </div>
  );
}
