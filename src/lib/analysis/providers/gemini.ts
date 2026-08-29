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

const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const MAX_OUTPUT_TOKENS = 8192;

/**
 * IMPORTANT LIMITATION — this provider never sees the video.
 *
 * Only the caption, the transcript and the public metrics are sent. The MP4
 * stays on disk and is not uploaded. That means nothing this provider returns
 * can be a genuine visual observation: a model with no frames describing a
 * "sharp cut to a wide shot" is inventing it, and an invented observation is
 * worse than an absent one because it enters the lab wearing the "נצפה" badge.
 *
 * The note below is appended to the shared prompt to make that boundary
 * explicit to the model. If frames or the video are ever sent, remove it.
 */
const NO_VIDEO_NOTE = `IMPORTANT: you have NOT been given the video file or any frames. You are working from the caption, the transcript and the public metrics only.

Therefore:
- Do not describe anything you could only know by watching: camera moves, cuts, framing, on-screen text, facial expressions, locations shown, editing pace.
- "visualHook" must say plainly, in Hebrew, that the video was not available and that no visual hook could be assessed. Mark it "inferred" with confidence "low".
- Anything you derive from the transcript's wording or the caption is "observed". Anything you derive from the shape of the transcript is "inferred".
- For "structureTimeline", base beats on the order of the transcript. If the transcript carries no timings, say so in the beat labels and keep "at" values approximate.
- Never invent a timestamp, a metric or a quote that is not in the material you were given.`;

type GeminiPart = { text?: string };
type GeminiCandidate = {
  content?: { parts?: GeminiPart[] };
  finishReason?: string;
};
type GeminiResponse = {
  candidates?: GeminiCandidate[];
  promptFeedback?: { blockReason?: string };
};

function extractText(body: GeminiResponse): string {
  const parts = body.candidates?.[0]?.content?.parts ?? [];
  return parts
    .map((part) => part.text)
    .filter((text): text is string => typeof text === "string")
    .join("")
    .trim();
}

/** Models sometimes fence JSON even when asked for `application/json`. */
function stripFences(text: string): string {
  const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/m.exec(text.trim());
  return (fenced ? fenced[1] : text).trim();
}

/**
 * Model names arrive from the environment and are interpolated into a URL path,
 * so they are constrained rather than trusted.
 */
const MODEL_PATTERN = /^[A-Za-z0-9._-]{1,64}$/;

export function createGeminiAnalysisProvider(): AnalysisProvider {
  const model = serverEnv.analysisModel;

  return {
    id: "gemini",
    runMode: "live",
    model,
    async analyse(input: AnalysisInput): Promise<AnalysisResult> {
      const apiKey = serverEnv.analysisApiKey;
      if (!apiKey) {
        throw new AnalysisUnavailableError(
          "ספק הניתוח מוגדר כ-gemini אך אין מפתח API.",
          "הוסיפו ANALYSIS_API_KEY לקובץ .env, או החזירו את ANALYSIS_PROVIDER ל-fixture.",
        );
      }

      if (!MODEL_PATTERN.test(model)) {
        throw new AnalysisUnavailableError(
          "שם המודל ב-ANALYSIS_MODEL אינו תקין.",
          "השתמשו בשם מודל כמו gemini-2.5-flash-lite, ללא רווחים או תווים מיוחדים.",
        );
      }

      let response: Response;
      try {
        response = await fetch(`${API_BASE}/${model}:generateContent`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            // The key travels in a header, never in the URL — query strings end
            // up in proxy logs and browser histories.
            "x-goog-api-key": apiKey,
          },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: ANALYSIS_SYSTEM_PROMPT }] },
            contents: [
              {
                role: "user",
                parts: [{ text: `${buildAnalysisUserPrompt(input)}\n\n${NO_VIDEO_NOTE}` }],
              },
            ],
            generationConfig: {
              responseMimeType: "application/json",
              maxOutputTokens: MAX_OUTPUT_TOKENS,
              temperature: 0.2,
            },
          }),
        });
      } catch {
        // The caught error is deliberately discarded. A fetch failure can carry
        // the request object, and the request carries the API key header.
        throw new AnalysisUnavailableError(
          "הקריאה ל-Gemini נכשלה.",
          "בדקו חיבור לרשת ונסו שוב. אפשר גם להחזיר את ANALYSIS_PROVIDER ל-fixture ולהמשיך עם נתוני דמו.",
        );
      }

      if (!response.ok) {
        // Only the status code is surfaced. Google's error body can echo the
        // request, and the request contains the key.
        if (response.status === 400 || response.status === 401 || response.status === 403) {
          throw new AnalysisUnavailableError(
            "Gemini דחתה את ההרשאה.",
            "בדקו את ANALYSIS_API_KEY ואת ההרשאות של המפתח ב-Google AI Studio. הערך עצמו לא מוצג כאן לעולם.",
          );
        }
        if (response.status === 404) {
          throw new AnalysisUnavailableError(
            "המודל שהוגדר לא נמצא ב-Gemini.",
            "בדקו את ANALYSIS_MODEL. ערך עובד לשכבה החינמית: gemini-2.5-flash-lite.",
          );
        }
        if (response.status === 429) {
          throw new AnalysisUnavailableError(
            "עברתם את מכסת השימוש של Gemini.",
            "המתינו מעט ונסו שוב. בשכבה החינמית יש מגבלת בקשות לדקה וליום.",
          );
        }
        if (response.status >= 500) {
          throw new AnalysisUnavailableError(
            "שירות Gemini אינו זמין כרגע.",
            "נסו שוב בעוד רגע. לא נשמר ניתוח חלקי.",
          );
        }
        throw new AnalysisUnavailableError(
          `Gemini החזירה שגיאה (${response.status}).`,
          "נסו שוב, או החזירו את ANALYSIS_PROVIDER ל-fixture כדי להמשיך לעבוד.",
        );
      }

      let body: GeminiResponse;
      try {
        body = (await response.json()) as GeminiResponse;
      } catch {
        throw new AnalysisUnavailableError(
          "התשובה מ-Gemini לא הייתה JSON קריא.",
          "לא נשמר ניתוח. נסו להריץ שוב.",
        );
      }

      if (body.promptFeedback?.blockReason) {
        throw new AnalysisUnavailableError(
          "Gemini חסמה את הבקשה מסיבות מדיניות תוכן.",
          "אפשר לנסות ריל אחר, או להשתמש בספק ניתוח אחר.",
        );
      }

      const finishReason = body.candidates?.[0]?.finishReason;
      if (finishReason === "MAX_TOKENS") {
        throw new AnalysisUnavailableError(
          "התשובה מ-Gemini נקטעה באמצע ולכן לא נשמרה.",
          "התמלול ככל הנראה ארוך מדי. נסו ריל קצר יותר, או ספק ניתוח אחר.",
        );
      }
      if (finishReason === "SAFETY" || finishReason === "PROHIBITED_CONTENT") {
        throw new AnalysisUnavailableError(
          "Gemini עצרה את התשובה מסיבות בטיחות תוכן.",
          "אפשר לנסות ריל אחר, או להשתמש בספק ניתוח אחר.",
        );
      }

      const text = stripFences(extractText(body));
      if (text === "") {
        throw new AnalysisUnavailableError(
          "Gemini החזירה תשובה ריקה.",
          "לא נשמר ניתוח. נסו להריץ שוב.",
        );
      }

      let raw: unknown;
      try {
        raw = JSON.parse(text);
      } catch {
        throw new AnalysisUnavailableError(
          "Gemini לא החזירה JSON תקין.",
          "לא נשמר ניתוח — הכלי אינו ממציא ניתוח כשהתשובה אינה תקינה. נסו שוב.",
        );
      }

      const parsed = parseAnalysisPayload(raw);
      if (!parsed.ok) {
        // Schema issues are safe to show: they describe our own field contract,
        // not the model's response content.
        throw new AnalysisUnavailableError(
          "תשובת Gemini לא עמדה בסכמת הניתוח ולכן לא נשמרה.",
          parsed.issues.slice(0, 6).join(" | "),
        );
      }

      return {
        payload: parsed.payload,
        provider: "gemini",
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
