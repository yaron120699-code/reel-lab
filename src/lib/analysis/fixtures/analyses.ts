import { ANALYSIS_PROMPT_VERSION, type ReelAnalysisPayload } from "../schema";

/**
 * Pre-baked analyses for the demo reels.
 *
 * These exist so the whole flow — import, analyse, compare, save a pattern —
 * can be walked through with no model API configured. They are stored with
 * runMode `fixture` and the UI labels them as sample data everywhere they
 * appear. Nothing here is ever presented as the output of a live model.
 */

export const FIXTURE_SHORT_CODES = ["DEMOhook01", "DEMOslow02"] as const;

export const FIXTURE_ANALYSES: Record<string, ReelAnalysisPayload> = {
  DEMOhook01: {
    schemaVersion: 1,
    promptVersion: ANALYSIS_PROMPT_VERSION,
    verbalHook: {
      value: "„עצרנו את הרכב באמצע הכביש — ולא בגלל תקלה.”",
      evidence: "observed",
      note: "נאמר בשנייה 0:00–0:03 בתמלול.",
    },
    visualHook: {
      value:
        "צילום יד מתוך הרכב אל כביש ריק, המצלמה מסתובבת חדות אל דמות שעומדת בצד הדרך.",
      evidence: "observed",
      note: "שלוש השניות הראשונות.",
    },
    hookMechanism: {
      value:
        "סתירה מוצהרת: המשפט שולל את ההסבר המתבקש („תקלה”) לפני שהצופה הספיק להציע אותו, ומשאיר שאלה פתוחה אחת בלבד.",
      evidence: "inferred",
      confidence: "high",
    },
    viewerPromise: {
      value: "בתוך פחות מדקה תדעו למה שווה לעצור באמצע כביש, ותוכלו לעשות זאת בעצמכם.",
      evidence: "inferred",
      confidence: "medium",
    },
    openLoops: {
      items: [
        "מי הדמות שעומדת בצד הדרך?",
        "מה גרם לעצירה, אם לא תקלה?",
        "האם הם הגיעו ליעד המקורי בסוף?",
      ],
      evidence: "observed",
      note: "שלוש שאלות שנפתחות ואינן נענות לפני 0:20.",
    },
    structureTimeline: {
      beats: [
        { at: "0:00–0:03", label: "סתירה", description: "הצהרה ששוללת את ההסבר הצפוי." },
        { at: "0:03–0:09", label: "הרחבה", description: "הקשר מינימלי: איפה, מתי, מי נוסע." },
        { at: "0:09–0:22", label: "הסלמה", description: "שתי מכשלות נוספות, כל אחת קצרה מקודמתה." },
        { at: "0:22–0:34", label: "גילוי", description: "הסיבה האמיתית לעצירה נחשפת." },
        { at: "0:34–0:41", label: "פייאוף", description: "התוצאה המוחשית: הנוף שאי אפשר לראות מהכביש." },
        { at: "0:41–0:46", label: "סגירה", description: "משפט מסכם וקריאה לשמור." },
      ],
      evidence: "observed",
    },
    concreteExamples: {
      items: [
        "שם מדויק של נקודת הציון בצד הדרך.",
        "משך הנסיעה בדקות מהצומת הקרוב.",
        "צילום של השלט בפועל, לא תיאור מילולי שלו.",
      ],
      evidence: "observed",
    },
    escalation: {
      value:
        "כל ביט קצר מקודמו, והמרווח בין חשיפות מידע מתקצר לקראת הגילוי. אין ירידה במתח באמצע.",
      evidence: "inferred",
      confidence: "medium",
    },
    retentionMechanisms: {
      items: [
        "לולאה פתוחה יחידה שמוחזקת עד 0:22 ומונעת נקודת יציאה טבעית.",
        "קיצור הדרגתי של הביטים שמייצר תחושת האצה.",
        "דחיית הגילוי הוויזואלי אל מעבר לאמצע הריל.",
      ],
      evidence: "inferred",
      confidence: "medium",
      note: "השערות שימור בלבד. נתוני אינסטגרם הציבוריים אינם כוללים עקומת צפייה.",
    },
    payoff: {
      value: "הנוף נחשף בצילום רחב אחד, אחרי שלוש דחיות — ההבטחה מהשנייה הראשונה נסגרת במלואה.",
      evidence: "observed",
    },
    closing: {
      value: "משפט אחד קצר על המקום, בלי סיכום חוזר של מה שנאמר.",
      evidence: "observed",
    },
    cta: {
      value: "„שמרו את זה לנסיעה הבאה” — נאמר פעם אחת, בסוף בלבד.",
      evidence: "observed",
    },
    tone: {
      value: "דיבורי, מהיר, בגוף ראשון רבים. בלי הקראה ובלי נימה פרסומית.",
      evidence: "observed",
    },
    topic: {
      value: "עצירה לא מתוכננת בדרך צפונה ונקודת תצפית שאינה מסומנת.",
      evidence: "observed",
    },
    language: {
      value: "עברית",
      evidence: "measured",
      sourceField: "transcript",
    },
    transferableLesson: {
      value:
        "פתיחה שמנטרלת את ההסבר המתבקש יוצרת שאלה פתוחה אחת במקום כמה מפוזרות. אפשר לאמץ את המבנה הזה בלי לאמץ את הניסוח, את הפרסונה או את סוג הסיפור.",
      evidence: "inferred",
      confidence: "medium",
    },
    risks: {
      items: [
        "שלילת הסבר בפתיחה נשחקת אם חוזרים עליה בכל ריל.",
        "המבנה דורש גילוי ויזואלי חזק בסוף; בלעדיו הפתיחה מבטיחה יתר על המידה.",
      ],
      evidence: "inferred",
      confidence: "medium",
    },
  },

  DEMOslow02: {
    schemaVersion: 1,
    promptVersion: ANALYSIS_PROMPT_VERSION,
    verbalHook: {
      value: "„אז אחרי שבוע של תכנונים החלטנו לצאת לדרך, וזה מה שיצא לנו.”",
      evidence: "observed",
      note: "נאמר בשנייה 0:00–0:06 בתמלול.",
    },
    visualHook: {
      value: "צילום סטטי של הרכב בחניה, טעינת ציוד לתא המטען.",
      evidence: "observed",
    },
    hookMechanism: {
      value:
        "מסגור כרונולוגי: הריל מתחיל מהתחלת התהליך ולא מנקודת המתח, כך שהצופה מתבקש להשקיע לפני שהובטח לו משהו.",
      evidence: "inferred",
      confidence: "medium",
    },
    viewerPromise: {
      value: "ההבטחה מרומזת בלבד — „יהיה טיול” — ואינה מנוסחת כשאלה שדורשת תשובה.",
      evidence: "inferred",
      confidence: "medium",
    },
    openLoops: {
      items: ["האם הטיול יצליח?"],
      evidence: "observed",
      note: "לולאה כללית אחת, נפתחת רק סביב 0:14.",
    },
    structureTimeline: {
      beats: [
        { at: "0:00–0:06", label: "רקע", description: "הסבר על התכנון שקדם ליציאה." },
        { at: "0:06–0:14", label: "הכנות", description: "טעינת ציוד, בלי אירוע." },
        { at: "0:14–0:28", label: "נסיעה", description: "צילומי דרך עם קריינות תיאורית." },
        { at: "0:28–0:44", label: "הגעה", description: "הגעה ליעד ותיאור המקום." },
        { at: "0:44–0:52", label: "סגירה", description: "סיכום מילולי של מה שנראה." },
      ],
      evidence: "observed",
    },
    concreteExamples: {
      items: ["שם היעד נאמר פעם אחת ב-0:31."],
      evidence: "observed",
    },
    escalation: {
      value: "אורך הביטים גדל לאורך הריל והמתח נשאר שטוח; אין נקודת שבירה.",
      evidence: "inferred",
      confidence: "medium",
    },
    retentionMechanisms: {
      items: [
        "הסתמכות על עניין בנוף במקום על שאלה פתוחה.",
        "קריינות רציפה ללא חיתוכים חדים, שעשויה להקטין את תחושת הקצב.",
      ],
      evidence: "inferred",
      confidence: "low",
      note: "השערות בלבד; אין גישה לעקומת שימור של יוצר אחר.",
    },
    payoff: {
      value: "היעד נראה, אך אחרי שכבר תואר במילים — הגילוי הוויזואלי מגיע אחרי המילולי.",
      evidence: "observed",
    },
    closing: {
      value: "סיכום שחוזר על מה שנאמר קודם.",
      evidence: "observed",
    },
    cta: {
      value: "אין קריאה לפעולה מפורשת.",
      evidence: "observed",
    },
    tone: {
      value: "רגוע, תיאורי, בקצב אחיד.",
      evidence: "observed",
    },
    topic: {
      value: "יציאה מתוכננת לטיול ותיעוד כרונולוגי שלה.",
      evidence: "observed",
    },
    language: {
      value: "עברית",
      evidence: "measured",
      sourceField: "transcript",
    },
    transferableLesson: {
      value:
        "פתיחה כרונולוגית דוחה את נקודת המתח ומחייבת את הצופה להשקיע לפני שקיבל סיבה. אם הסיפור מתחיל מהאמצע, אפשר לפתוח משם ולהחזיר את הרקע בהמשך.",
      evidence: "inferred",
      confidence: "medium",
    },
    risks: {
      items: [
        "המבנה הזה עשוי לעבוד היטב לקהל שכבר עוקב אחרי היוצר.",
        "מדד ביצועים נמוך יותר אינו מוכיח שהמבנה גרוע — ייתכנו הבדלי נושא, עונה או הפצה.",
      ],
      evidence: "inferred",
      confidence: "medium",
    },
  },
};

export function getFixtureAnalysis(shortCode: string): ReelAnalysisPayload | null {
  return FIXTURE_ANALYSES[shortCode] ?? null;
}
