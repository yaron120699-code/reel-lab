"use client";

import { useState } from "react";

/**
 * A reel thumbnail, or an honest stand-in for one.
 *
 * Instagram CDN URLs are hotlink-protected and expire, so a thumbnail that
 * worked at import time will often be a broken image by the time anyone looks
 * at it. Rather than show a torn-image icon, this falls back to a placeholder
 * built from the reel's own shortCode — which is the thing a researcher
 * actually uses to identify a reel.
 */
export function ReelThumb({
  shortCode,
  thumbnailUrl,
  hasVideoFile,
}: {
  shortCode: string;
  thumbnailUrl: string | null;
  hasVideoFile: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const showImage = thumbnailUrl !== null && !failed;

  return (
    <div className="relative flex h-36 items-center justify-center overflow-hidden border-b border-rule bg-paper-sunken">
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumbnailUrl}
          alt=""
          loading="lazy"
          onError={() => setFailed(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            backgroundImage:
              "repeating-linear-gradient(135deg, transparent, transparent 9px, color-mix(in srgb, var(--color-rule-strong) 45%, transparent) 9px, color-mix(in srgb, var(--color-rule-strong) 45%, transparent) 10px)",
          }}
        />
      )}

      <span
        dir="ltr"
        className={
          showImage
            ? "relative rounded-[3px] bg-paper/85 px-1.5 py-0.5 font-mono text-[0.7rem] text-ink"
            : "relative rounded-[3px] border border-rule-strong bg-paper px-2 py-1 font-mono text-[0.78rem] tracking-wide text-ink-muted"
        }
      >
        {shortCode}
      </span>

      {hasVideoFile ? (
        <span className="absolute bottom-1.5 start-1.5 rounded-[3px] border border-measured/40 bg-measured-wash px-1.5 py-0.5 font-mono text-[0.62rem] text-measured">
          MP4 מקומי
        </span>
      ) : null}
    </div>
  );
}
