import "@/lib/server-only";

import { FIXTURE_SHORT_CODES } from "@/lib/analysis/fixtures/analyses";
import { serverEnv } from "@/lib/config/env";
import { DEMO_COMPETITOR_ID, demoReelId } from "@/lib/demo/fixtures";
import { seedCanonicalDemo } from "@/lib/demo/seed";
import { buildDemoVideo } from "@/lib/demo/video";
import { getRepositories } from "@/lib/repositories";

import { attachVideoFile } from "./import";

export type SeedResult = {
  competitorId: string;
  createdReels: number;
  createdAnalyses: number;
  attachedVideos: number;
  videoNote: string | null;
  alreadySeeded: boolean;
};

/**
 * The manual "load demo data" path.
 *
 * It shares the canonical seeder with the automatic serverless seed, so there
 * is exactly one demo dataset. The only thing it adds is the generated MP4
 * files, which are skipped on a serverless filesystem because writes there do
 * not survive the instance.
 */
export async function seedDemoData(): Promise<
  { ok: true; result: SeedResult } | { ok: false; error: string }
> {
  const repos = getRepositories();

  let counts;
  try {
    counts = await seedCanonicalDemo(repos);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "טעינת נתוני הדמו נכשלה.",
    };
  }

  let attachedVideos = 0;
  let videoNote: string | null = null;

  if (serverEnv.isVercel) {
    videoNote = "בסביבת Vercel לא נשמרים קובצי וידאו — האחסון המקומי נמחק עם המופע.";
  } else {
    for (const shortCode of FIXTURE_SHORT_CODES) {
      const reelId = demoReelId(shortCode);
      if (!(await repos.reels.findById(reelId))) continue;

      const existingMedia = await repos.media.listForReel(reelId);
      if (existingMedia.some((item) => item.kind === "video")) continue;

      const video = await buildDemoVideo(shortCode);
      if (!video.ok) {
        videoNote = video.reason;
        continue;
      }

      const attached = await attachVideoFile({
        reelId,
        filename: video.filename,
        mimeType: "video/mp4",
        bytes: video.bytes,
      });
      if (attached.ok) attachedVideos += 1;
    }
  }

  return {
    ok: true,
    result: {
      competitorId: DEMO_COMPETITOR_ID,
      createdReels: counts.reels,
      createdAnalyses: counts.analyses,
      attachedVideos,
      videoNote,
      alreadySeeded: counts.competitors === 0,
    },
  };
}
