import "@/lib/server-only";

import { serverEnv } from "@/lib/config/env";

import { ANALYSIS_SYSTEM_PROMPT, buildAnalysisUserPrompt } from "../prompt";
import {
  AnalysisUnavailableError,
  type AnalysisInput,
  type AnalysisProvider,
  type AnalysisResult,
} from "../provider";
import { ANALYSIS_PROMPT_VERSION, parseAnalysisPayload } from "../schema";

const API_URL = "https://api.anthropic.com/v1/messages";
const API_VERSION = "2023-06-01";

type MessagesResponse = {
  content?: Array<{ type: string; text?: string }>;
};

function extractText(body: MessagesResponse): string {
  return (body.content ?? [])
    .filter((block) => block.type === "text" && typeof block.text === "string")
    .map((block) => block.text as string)
    .join("\n")
    .trim();
}

/** Models occasionally wrap JSON in a fence despite instructions. */
function stripFences(text: string): string {
  const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/m.exec(text.trim());
  return (fenced ? fenced[1] : text).trim();
}

/**
 * Live provider. Everything model-specific lives in this file, so replacing it
 * with a different vendor means adding a sibling module and one branch in
 * `getAnalysisProvider`.
 */
export function createAnthropicAnalysisProvider(): AnalysisProvider {
  const model = serverEnv.analysisModel;

  return {
    id: "anthropic",
    runMode: "live",
    model,
    async analyse(input: AnalysisInput): Promise<AnalysisResult> {
      const apiKey = serverEnv.analysisApiKey;
      if (!apiKey) {
        throw new AnalysisUnavailableError(
          "ספק הניתוח מוגדר כ-anthropic אך אין מפתח API.",
          "הוסיפו ANALYSIS_API_KEY לקובץ .env, או החזירו את ANALYSIS_PROVIDER ל-fixture.",
        );
      }

      let response: Response;
      try {
        response = await fetch(API_URL, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": API_VERSION,
          },
          body: JSON.stringify({
            model,
            max_tokens: 4000,
            system: ANALYSIS_SYSTEM_PROMPT,
            messages: [{ role: "user", content: buildAnalysisUserPrompt(input) }],
          }),
        });
      } catch {
        // The error is swallowed deliberately: a network error object can carry
        // request headers, and those headers carry the API key.
        throw new AnalysisUnavailableError(
          "הקריאה לספק הניתוח נכשלה.",
          "בדקו חיבור לרשת ונסו שוב. אפשר גם להחזיר את ANALYSIS_PROVIDER ל-fixture ולהמשיך עם נתוני דמו.",
        );
      }

      if (!response.ok) {
        throw new AnalysisUnavailableError(
          `ספק הניתוח החזיר שגיאה (${response.status}).`,
          "אם זו שגיאת הרשאה, בדקו את ANALYSIS_API_KEY. אם זו הגבלת קצב, נסו שוב בעוד רגע.",
        );
      }

      const body = (await response.json()) as MessagesResponse;
      const text = stripFences(extractText(body));

      let raw: unknown;
      try {
        raw = JSON.parse(text);
      } catch {
        throw new AnalysisUnavailableError(
          "ספק הניתוח לא החזיר JSON תקין.",
          "לא נשמר ניתוח. הריצו שוב — הלב אינו ממציא ניתוח כשהתשובה אינה תקינה.",
        );
      }

      const parsed = parseAnalysisPayload(raw);
      if (!parsed.ok) {
        throw new AnalysisUnavailableError(
          "תשובת המודל לא עמדה בסכמת הניתוח ולכן לא נשמרה.",
          parsed.issues.slice(0, 6).join(" | "),
        );
      }

      return {
        payload: parsed.payload,
        provider: "anthropic",
        model,
        runMode: "live",
        promptVersion: ANALYSIS_PROMPT_VERSION,
        transcriptRef: input.transcript === null ? null : `reel:${input.reel.id}#transcript`,
        language: parsed.payload.language.value,
        analysedAt: new Date().toISOString(),
      };
    },
  };
}
