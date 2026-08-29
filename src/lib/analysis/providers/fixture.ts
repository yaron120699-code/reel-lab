import { getFixtureAnalysis } from "../fixtures/analyses";
import {
  AnalysisUnavailableError,
  type AnalysisInput,
  type AnalysisProvider,
  type AnalysisResult,
} from "../provider";
import { ANALYSIS_PROMPT_VERSION, parseAnalysisPayload } from "../schema";

/**
 * Offline provider. It serves pre-baked analyses for the demo reels and refuses
 * everything else — a demo fixture may stand in for a model run, but it may
 * never impersonate one for a reel it has never seen.
 */
export function createFixtureAnalysisProvider(): AnalysisProvider {
  return {
    id: "fixture",
    runMode: "fixture",
    model: null,
    async analyse(input: AnalysisInput): Promise<AnalysisResult> {
      const fixture = getFixtureAnalysis(input.reel.shortCode);

      if (!fixture) {
        throw new AnalysisUnavailableError(
          "לא הוגדר ספק ניתוח חי, ולריל הזה אין ניתוח דוגמה מוכן.",
          "הגדירו ANALYSIS_PROVIDER=anthropic ומפתח ANALYSIS_API_KEY בקובץ .env, או טענו את נתוני הדמו כדי לראות את מבנה הניתוח מקצה לקצה.",
        );
      }

      const parsed = parseAnalysisPayload(fixture);
      if (!parsed.ok) {
        throw new AnalysisUnavailableError(
          "ניתוח הדוגמה אינו עומד בסכמה.",
          parsed.issues.join(" | "),
        );
      }

      return {
        payload: parsed.payload,
        provider: "fixture",
        model: null,
        runMode: "fixture",
        promptVersion: ANALYSIS_PROMPT_VERSION,
        transcriptRef: input.transcript === null ? null : `reel:${input.reel.id}#transcript`,
        language: parsed.payload.language.value,
        analysedAt: new Date().toISOString(),
      };
    },
  };
}
