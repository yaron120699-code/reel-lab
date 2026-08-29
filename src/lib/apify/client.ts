import "@/lib/server-only";

import { serverEnv } from "@/lib/config/env";

/**
 * Optional convenience path: pull a finished Apify dataset instead of pasting
 * its JSON. The manual paste flow is the supported one and works without any
 * token; this exists so a configured token does not go unused.
 *
 * APIFY_API_TOKEN is read here and nowhere else. It is sent as a header, never
 * placed in a URL, never returned to a caller and never written to a log.
 */

export type ApifyFetchResult =
  | { ok: true; items: unknown[] }
  | { ok: false; error: string; hint: string };

export type InstagramReelTarget = {
  url: string;
  shortCode: string;
};

const REEL_PATH_PATTERN = /^\/(?:reel|reels|p)\/([A-Za-z0-9_-]+)\/?$/i;

/**
 * Accept only a direct public Instagram reel URL. Query parameters from the
 * mobile share sheet are discarded before the URL is sent to Apify.
 */
export function parseInstagramReelUrl(input: string): InstagramReelTarget | null {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase();
  if (
    url.protocol !== "https:" ||
    (host !== "instagram.com" && host !== "www.instagram.com" && host !== "m.instagram.com")
  ) {
    return null;
  }

  const match = REEL_PATH_PATTERN.exec(url.pathname);
  if (!match) return null;

  return {
    url: `https://www.instagram.com/reel/${match[1]}/`,
    shortCode: match[1],
  };
}

const DATASET_ID_PATTERN = /^[A-Za-z0-9_-]{5,40}$/;

export function isApifyConfigured(): boolean {
  return serverEnv.apifyApiToken !== null;
}

/**
 * Runs Apify's maintained Instagram Reel Scraper for one direct reel URL and
 * waits for its dataset. The token stays in the Authorization header; it is
 * never placed in the query string or returned in an error.
 */
export async function fetchInstagramReel(url: string): Promise<ApifyFetchResult> {
  const token = serverEnv.apifyApiToken;
  if (!token) {
    return {
      ok: false,
      error: "לא הוגדר טוקן ל-Apify.",
      hint: "הוסיפו APIFY_API_TOKEN לקובץ .env והפעילו מחדש את השרת.",
    };
  }

  const target = parseInstagramReelUrl(url);
  if (!target) {
    return {
      ok: false,
      error: "כתובת הריל אינה תקינה.",
      hint: "הדביקו כתובת מלאה של ריל ציבורי מ-instagram.com.",
    };
  }

  let response: Response;
  try {
    response = await fetch(
      "https://api.apify.com/v2/actors/apify~instagram-reel-scraper/run-sync-get-dataset-items?timeout=180",
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          username: [target.url],
          resultsLimit: 1,
          includeTranscript: true,
          includeDownloadedVideo: false,
          includeSharesCount: false,
        }),
        cache: "no-store",
      },
    );
  } catch {
    return {
      ok: false,
      error: "לא הצלחנו להפעיל את Apify.",
      hint: "בדקו את החיבור לרשת ונסו שוב.",
    };
  }

  if (response.status === 401 || response.status === 403) {
    return {
      ok: false,
      error: "Apify דחתה את ההרשאה.",
      hint: "בדקו את APIFY_API_TOKEN בקובץ .env.",
    };
  }
  if (response.status === 408) {
    return {
      ok: false,
      error: "הסריקה עדיין לא הסתיימה.",
      hint: "המתינו דקה ונסו שוב. לא נשמר ריל חלקי.",
    };
  }
  if (response.status === 402) {
    return {
      ok: false,
      error: "אין מספיק קרדיט בחשבון Apify.",
      hint: "בדקו את יתרת השימוש ב-Apify Console.",
    };
  }
  if (!response.ok) {
    return {
      ok: false,
      error: `Apify החזירה שגיאה (${response.status}).`,
      hint: "נסו שוב בעוד רגע. גוף השגיאה אינו מוצג כדי לא לחשוף מידע מהבקשה.",
    };
  }

  const body = (await response.json()) as unknown;
  if (!Array.isArray(body) || body.length === 0) {
    return {
      ok: false,
      error: "Apify לא מצאה את הריל.",
      hint: "ודאו שהריל ציבורי ושהקישור עדיין נפתח באינסטגרם.",
    };
  }

  return { ok: true, items: body };
}

export async function fetchApifyDatasetItems(datasetId: string): Promise<ApifyFetchResult> {
  const token = serverEnv.apifyApiToken;
  if (!token) {
    return {
      ok: false,
      error: "לא הוגדר טוקן ל-Apify.",
      hint: "הוסיפו APIFY_API_TOKEN לקובץ .env, או הדביקו את ה-JSON ידנית — הזרימה הידנית עובדת בלי טוקן.",
    };
  }

  const trimmed = datasetId.trim();
  if (!DATASET_ID_PATTERN.test(trimmed)) {
    return {
      ok: false,
      error: "מזהה ה-dataset אינו תקין.",
      hint: "העתיקו את המזהה מכתובת ה-run ב-Apify, למשל aBcD1234efGh5678.",
    };
  }

  let response: Response;
  try {
    response = await fetch(
      `https://api.apify.com/v2/datasets/${encodeURIComponent(trimmed)}/items?clean=true&format=json`,
      { headers: { authorization: `Bearer ${token}` }, cache: "no-store" },
    );
  } catch {
    // Deliberately not forwarding the caught error: fetch errors can carry the
    // request, and the request carries the token.
    return {
      ok: false,
      error: "לא הצלחנו להתחבר ל-Apify.",
      hint: "בדקו חיבור לרשת, או הדביקו את ה-JSON ידנית.",
    };
  }

  if (response.status === 401 || response.status === 403) {
    return {
      ok: false,
      error: "Apify דחתה את ההרשאה.",
      hint: "בדקו את APIFY_API_TOKEN בקובץ .env. הערך עצמו לא מוצג כאן לעולם.",
    };
  }
  if (response.status === 404) {
    return {
      ok: false,
      error: "לא נמצא dataset עם המזהה הזה.",
      hint: "ודאו שה-run הסתיים ושהמזהה שייך לחשבון שהטוקן שייך אליו.",
    };
  }
  if (!response.ok) {
    return {
      ok: false,
      error: `Apify החזירה שגיאה (${response.status}).`,
      hint: "נסו שוב בעוד רגע, או הדביקו את ה-JSON ידנית.",
    };
  }

  const body = (await response.json()) as unknown;
  if (!Array.isArray(body)) {
    return {
      ok: false,
      error: "התשובה מ-Apify אינה מערך פריטים.",
      hint: "ודאו שהמזהה מצביע על dataset ולא על run.",
    };
  }

  return { ok: true, items: body };
}
