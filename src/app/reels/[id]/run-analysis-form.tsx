"use client";

import { useActionState } from "react";

import { runAnalysisAction } from "@/app/actions";
import { IDLE, type ActionState } from "@/lib/action-state";
import { FormFeedback, SubmitButton } from "@/components/form";

export function RunAnalysisForm({
  reelId,
  hasAnalysis,
}: {
  reelId: string;
  hasAnalysis: boolean;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(runAnalysisAction, IDLE);

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="reelId" value={reelId} />
      <SubmitButton pendingLabel="מריץ ניתוח…" quiet={hasAnalysis}>
        {hasAnalysis ? "הרצת ניתוח מחדש" : "הרצת ניתוח"}
      </SubmitButton>
      <FormFeedback state={state} />
    </form>
  );
}
