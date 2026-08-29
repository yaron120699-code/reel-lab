"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { PublicRuntimeFlags } from "@/lib/config/env";

const LINKS = [
  { href: "/competitors", label: "יוצרים", hint: "מי אנחנו חוקרים" },
  { href: "/reels", label: "ספריית רילים", hint: "מה יובא" },
  { href: "/import", label: "ייבוא ריל", hint: "JSON ו-MP4" },
  { href: "/compare", label: "השוואה", hint: "שני רילים זה מול זה" },
  { href: "/patterns", label: "ספריית תבניות", hint: "מה למדנו" },
];

export function NavRail({ flags }: { flags: PublicRuntimeFlags }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="ניווט ראשי"
      className="shrink-0 border-b border-rule bg-paper-sunken px-5 py-6 sm:px-8 lg:w-64 lg:border-b-0 lg:border-s lg:px-6 lg:py-8"
    >
      <Link href="/competitors" className="block">
        <p className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-ink-faint">
          Baderech
        </p>
        <h1 className="mt-1 font-display text-xl leading-tight">מעבדת מתחרים</h1>
      </Link>

      <p className="mt-3 border-t border-rule pt-3 text-[0.78rem] leading-relaxed text-ink-muted">
        לשאול מבנה, אף פעם לא זהות.
      </p>

      <ul className="mt-6 flex flex-wrap gap-x-4 gap-y-1 lg:block lg:space-y-1">
        {LINKS.map((link) => {
          const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`block rounded-[4px] px-2 py-1.5 text-sm transition-colors lg:px-3 ${
                  active
                    ? "bg-ink text-paper"
                    : "text-ink hover:bg-paper-raised"
                }`}
              >
                <span className="font-medium">{link.label}</span>
                <span
                  className={`hidden text-[0.7rem] lg:block ${
                    active ? "text-paper/70" : "text-ink-faint"
                  }`}
                >
                  {link.hint}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      <dl className="mt-8 space-y-2 border-t border-rule pt-4 text-[0.7rem] text-ink-muted">
        <div className="flex items-baseline justify-between gap-2">
          <dt>מצב</dt>
          <dd className="font-mono">
            {flags.ephemeralDemo ? "תצוגה" : flags.demoMode ? "דמו" : "רגיל"}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <dt>ספק ניתוח</dt>
          <dd className="font-mono">
            {flags.liveAnalysisConfigured ? flags.analysisProvider : "fixture"}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <dt>Apify</dt>
          <dd className="font-mono">{flags.apifyConfigured ? "מחובר" : "לא מוגדר"}</dd>
        </div>
      </dl>
    </nav>
  );
}
