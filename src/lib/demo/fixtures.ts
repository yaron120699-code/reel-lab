/**
 * The single canonical demo dataset.
 *
 * Every id here is hardcoded. That is the whole point: on Vercel each
 * serverless function gets its own empty `/tmp`, so the function that renders
 * `/reels` and the function that renders `/reels/<id>` are seeding two separate
 * SQLite files. With generated ids the second function would never hold the id
 * the first one linked to, and the detail page would 404. Fixed ids make the
 * two databases identical, so the links resolve everywhere.
 *
 * The manual "load demo data" button and the automatic serverless seed both
 * read from this file, so there is only ever one demo dataset to keep true.
 */

import type { CompetitorInput } from "@/lib/domain/types";

/** Namespaced so a demo row is always recognisable in the database. */
const ID = {
  competitor: "demo-competitor-lior",
  reel: (slug: string) => `demo-reel-${slug}`,
  metrics: (slug: string) => `demo-metrics-${slug}`,
  analysis: (slug: string) => `demo-analysis-${slug}`,
  comparison: "demo-comparison-hook-vs-slow",
  pattern: "demo-pattern-conflict-first",
} as const;

export const DEMO_COMPETITOR_ID = ID.competitor;
export const DEMO_COMPARISON_ID = ID.comparison;
export const DEMO_PATTERN_ID = ID.pattern;

export const DEMO_COMPETITOR: CompetitorInput = {
  id: ID.competitor,
  displayName: "ליאור נבון (דמו)",
  instagramUsername: "lior.demo.reels",
  profileUrl: "https://www.instagram.com/lior.demo.reels/",
  country: "IL",
  niche: "סיפורי דרך וטיולים בישראל",
  relevanceNote:
    "יוצר דמו לצורך הדגמת הזרימה. בפועל: יוצר שמספר סיפורי מסע קצרים בעברית לקהל ישראלי, קרוב לקהל של בדרך.",
  tags: ["דמו", "מסע", "עברית"],
};

/**
 * Shaped exactly like an Apify Instagram scraper result, so seeding runs through
 * the same normalization code a pasted export does.
 *
 * `displayUrl` is deliberately absent. Instagram CDN thumbnail URLs are
 * hotlink-protected and expire, so a demo that carried them would render broken
 * images. The library falls back to a designed placeholder instead.
 */
export type DemoApifyItem = {
  url: string;
  shortCode: string;
  caption: string;
  timestamp: string;
  videoDuration: number;
  videoPlayCount: number | null;
  likesCount: number;
  commentsCount: number;
  transcript: string | null;
  videoUrl: string | null;
  ownerUsername: string;
  type: string;
  hashtags: string[];
};

export const DEMO_APIFY_ITEMS: DemoApifyItem[] = [
  {
    url: "https://www.instagram.com/reel/DEMOhook01/",
    shortCode: "DEMOhook01",
    caption: "עצרנו את הרכב באמצע הכביש — ולא בגלל תקלה. שמרו את זה לנסיעה הבאה צפונה.",
    timestamp: "2026-05-14T17:20:00.000Z",
    videoDuration: 46.2,
    videoPlayCount: 412000,
    likesCount: 18400,
    commentsCount: 512,
    transcript:
      "עצרנו את הרכב באמצע הכביש, ולא בגלל תקלה. היינו בדרך צפונה, שעה אחרי הצומת, ואז ראינו מישהו עומד בצד. אמרנו נמשיך, לא המשכנו. אחרי שתי דקות הבנו למה כדאי לעצור. מאתיים מטר מהכביש יש נקודה שאי אפשר לראות בכלל מהנסיעה. זה מה שראינו משם. שמרו את זה לנסיעה הבאה.",
    videoUrl: null,
    ownerUsername: "lior.demo.reels",
    type: "Video",
    hashtags: ["מסע", "צפון"],
  },
  {
    url: "https://www.instagram.com/reel/DEMOslow02/",
    shortCode: "DEMOslow02",
    caption: "אחרי שבוע של תכנונים יצאנו לדרך. הנה איך זה נראה.",
    timestamp: "2026-04-02T09:05:00.000Z",
    videoDuration: 52.8,
    videoPlayCount: 58000,
    likesCount: 3100,
    commentsCount: 87,
    transcript:
      "אז אחרי שבוע של תכנונים החלטנו לצאת לדרך, וזה מה שיצא לנו. העמסנו את הציוד בבוקר, יצאנו בערך בשמונה. הנסיעה עצמה לקחה שעתיים. הגענו למקום, וזה נראה בדיוק כמו שקיווינו. יש שם שקט, יש צל, ויש מקום לשבת. זה היה יום טוב.",
    videoUrl: null,
    ownerUsername: "lior.demo.reels",
    type: "Video",
    hashtags: ["מסע", "טיול"],
  },
  {
    url: "https://www.instagram.com/reel/DEMOcoh003/",
    shortCode: "DEMOcoh003",
    caption: "שלוש נקודות עצירה בין חיפה לראש פינה.",
    timestamp: "2026-05-02T18:40:00.000Z",
    videoDuration: 41.5,
    videoPlayCount: 96000,
    likesCount: 5200,
    commentsCount: 130,
    transcript: null,
    videoUrl: null,
    ownerUsername: "lior.demo.reels",
    type: "Video",
    hashtags: ["מסע"],
  },
  {
    url: "https://www.instagram.com/reel/DEMOcoh004/",
    shortCode: "DEMOcoh004",
    caption: "מה לוקחים ליום אחד בשטח ומה נשאר בבית.",
    timestamp: "2026-04-21T07:15:00.000Z",
    videoDuration: 38.0,
    videoPlayCount: 74000,
    likesCount: 4100,
    commentsCount: 96,
    transcript: null,
    videoUrl: null,
    ownerUsername: "lior.demo.reels",
    type: "Video",
    hashtags: ["ציוד"],
  },
  {
    url: "https://www.instagram.com/reel/DEMOcoh005/",
    shortCode: "DEMOcoh005",
    caption: "הכביש הזה נראה רגיל. הוא לא.",
    timestamp: "2026-03-18T16:00:00.000Z",
    videoDuration: 44.9,
    videoPlayCount: 118000,
    likesCount: 6400,
    commentsCount: 171,
    transcript: null,
    videoUrl: null,
    ownerUsername: "lior.demo.reels",
    type: "Video",
    hashtags: ["מסע"],
  },
  {
    // No play count and a much older publication date — this is the reel to
    // compare against when you want to see the comparability warning fire.
    url: "https://www.instagram.com/reel/DEMOold006/",
    shortCode: "DEMOold006",
    caption: "ארכיון: הקיץ שבו ישנו ברכב שלושה לילות.",
    timestamp: "2025-08-09T20:30:00.000Z",
    videoDuration: 88.4,
    videoPlayCount: null,
    likesCount: 2900,
    commentsCount: 64,
    transcript: null,
    videoUrl: null,
    ownerUsername: "lior.demo.reels",
    type: "Video",
    hashtags: ["ארכיון"],
  },
];

export const DEMO_APIFY_JSON = JSON.stringify(DEMO_APIFY_ITEMS, null, 2);

/** Fixed timestamps too, so two instances produce byte-identical rows. */
export const DEMO_SEEDED_AT = "2026-05-15T09:00:00.000Z";

export function demoReelId(shortCode: string): string {
  return ID.reel(shortCode);
}

export function demoMetricsId(shortCode: string): string {
  return ID.metrics(shortCode);
}

export function demoAnalysisId(shortCode: string): string {
  return ID.analysis(shortCode);
}

/** The saved comparison and Pattern Card the demo ships with. */
export const DEMO_COMPARISON = {
  id: ID.comparison,
  reelAShortCode: "DEMOhook01",
  reelBShortCode: "DEMOslow02",
  notes: "ההוק הפותח שונה לגמרי; שאר המבנה קרוב.",
};

export const DEMO_PATTERN = {
  id: ID.pattern,
  comparisonId: ID.comparison,
  title: "הקונפליקט המרכזי מופיע בחמש השניות הראשונות",
  description:
    "הפתיחה שוללת את ההסבר המתבקש לפני שהצופה הספיק להציע אותו, ומשאירה שאלה פתוחה אחת במקום כמה מפוזרות.",
  whenUseful: "כשיש אירוע קונקרטי אחד שאפשר לפתוח ממנו, ולא רק נושא כללי.",
  supportingShortCodes: ["DEMOhook01", "DEMOslow02"],
  counterexamples:
    "המדגם קטן, שני הרילים מאותו יוצר, והנושאים שונים במקצת. הפרש הביצועים עשוי לנבוע גם מהנושא ולא רק מהמבנה.",
  confidence: "medium" as const,
  baderechTranslation:
    "לפתוח באירוע קונקרטי או בסתירה לא פתורה, בלי להעתיק את הניסוח של היוצר, את הפרסונה שלו או את זהותו.",
  doNotCopyNote:
    "לא להעתיק ניסוח מדויק, שמות מקומות, סגנון דיבור או פרסונה. המבנה בלבד עובר.",
};
