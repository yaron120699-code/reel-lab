import type { Metadata } from "next";

import { DemoBanner } from "@/components/demo-banner";
import { NavRail } from "@/components/nav-rail";
import { publicRuntimeFlags } from "@/lib/config/env";

import "./globals.css";

export const metadata: Metadata = {
  title: "מעבדת מתחרים · בדרך",
  description:
    "כלי מחקר לניתוח מבני של רילים של יוצרים אחרים. לשאול מבנה, אף פעם לא זהות.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const flags = publicRuntimeFlags();

  return (
    <html lang="he" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/*
          Loaded at runtime rather than through next/font, so a production build
          never depends on reaching Google Fonts. The lint rule below is a
          pages-router check and does not apply to a root layout.
        */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Frank+Ruhl+Libre:wght@400;500;700&family=IBM+Plex+Sans+Hebrew:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-paper text-ink antialiased">
        <DemoBanner show={flags.ephemeralDemo} />
        <div className="mx-auto flex min-h-screen w-full max-w-[1440px] flex-col lg:flex-row-reverse">
          <NavRail flags={flags} />
          <main className="min-w-0 flex-1 px-5 py-8 sm:px-8 lg:px-12">{children}</main>
        </div>
      </body>
    </html>
  );
}
