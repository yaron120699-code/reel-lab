import type { AnalysisInput } from "./provider";
import { ANALYSIS_PROMPT_VERSION } from "./schema";

export const ANALYSIS_SYSTEM_PROMPT = `You analyse the STRUCTURE of short-form video, for a Hebrew-language research tool.

The tool's rule is: borrow structure, never identity. You describe how a reel is built. You never suggest copying its wording, persona, catchphrases or identity.

Classify every field with exactly one evidence kind:
- "measured": the value is present in the imported data or file. Set "sourceField" to the imported field name. Do NOT set "confidence".
- "observed": the value is directly visible or audible in the reel or its transcript. Set neither "sourceField" nor "confidence". Use "note" for a timestamp.
- "inferred": your interpretation or hypothesis. Set "confidence" to "low" | "medium" | "high". Do NOT set "sourceField".

"retentionMechanisms" MUST always be "inferred". Public Instagram data contains no retention curve, so a competitor's retention can only ever be a hypothesis. Never write or imply that it was measured.

If you cannot support a field, say so in its "value" rather than inventing detail. Never invent metrics, timestamps or quotes.

Write every "value", "items" entry and beat description in Hebrew.

Reply with a single JSON object and nothing else — no prose, no markdown fences.`;

export function buildAnalysisUserPrompt(input: AnalysisInput): string {
  const { reel, metrics, transcript, hasVideoFile } = input;

  const lines = [
    `promptVersion: ${ANALYSIS_PROMPT_VERSION}`,
    `shortCode: ${reel.shortCode}`,
    `sourceUrl: ${reel.sourceUrl}`,
    `publishedAt: ${reel.publishedAt ?? "unknown"}`,
    `videoDuration (seconds): ${reel.durationSeconds ?? "unknown"}`,
    `videoPlayCount: ${metrics.playCount ?? "not present in the import"}`,
    `likesCount: ${metrics.likesCount ?? "not present in the import"}`,
    `commentsCount: ${metrics.commentsCount ?? "not present in the import"}`,
    `local video file held: ${hasVideoFile ? "yes" : "no"}`,
    "",
    "caption:",
    reel.caption ?? "(none)",
    "",
    "transcript:",
    transcript ?? "(none — base observations on the caption only and say so)",
    "",
    "Return JSON matching this shape:",
    JSON.stringify(
      {
        schemaVersion: 1,
        promptVersion: ANALYSIS_PROMPT_VERSION,
        verbalHook: { value: "…", evidence: "observed", note: "0:00–0:03" },
        visualHook: { value: "…", evidence: "observed" },
        hookMechanism: { value: "…", evidence: "inferred", confidence: "medium" },
        viewerPromise: { value: "…", evidence: "inferred", confidence: "medium" },
        openLoops: { items: ["…"], evidence: "observed" },
        structureTimeline: {
          beats: [{ at: "0:00–0:03", label: "…", description: "…" }],
          evidence: "observed",
        },
        concreteExamples: { items: ["…"], evidence: "observed" },
        escalation: { value: "…", evidence: "inferred", confidence: "medium" },
        retentionMechanisms: { items: ["…"], evidence: "inferred", confidence: "low" },
        payoff: { value: "…", evidence: "observed" },
        closing: { value: "…", evidence: "observed" },
        cta: { value: "…", evidence: "observed" },
        tone: { value: "…", evidence: "observed" },
        topic: { value: "…", evidence: "observed" },
        language: { value: "…", evidence: "measured", sourceField: "transcript" },
        transferableLesson: { value: "…", evidence: "inferred", confidence: "medium" },
        risks: { items: ["…"], evidence: "inferred", confidence: "medium" },
      },
      null,
      2,
    ),
  ];

  return lines.join("\n");
}
