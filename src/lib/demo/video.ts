import { execFile } from "node:child_process";
import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);

/**
 * Builds a short placeholder MP4 for the demo walkthrough.
 *
 * The demo needs a real video file so the "attach an MP4" step can be exercised
 * end to end, but shipping competitor footage in a repository is exactly what
 * this project must not do. So the file is generated locally with ffmpeg when
 * ffmpeg exists, and the demo degrades gracefully when it does not.
 */

export type DemoVideoResult =
  | { ok: true; filename: string; bytes: Buffer }
  | { ok: false; reason: string };

async function hasFfmpeg(): Promise<boolean> {
  try {
    await run("ffmpeg", ["-version"], { timeout: 10_000 });
    return true;
  } catch {
    return false;
  }
}

export async function buildDemoVideo(label: string, seconds = 4): Promise<DemoVideoResult> {
  if (!(await hasFfmpeg())) {
    return {
      ok: false,
      reason:
        "ffmpeg לא מותקן, ולכן לא נוצר קובץ וידאו לדמו. שאר הזרימה עובדת; אפשר לצרף MP4 ידנית בעמוד הייבוא.",
    };
  }

  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), "baderech-demo-"));
  const target = path.join(dir, `${label}.mp4`);

  try {
    await run(
      "ffmpeg",
      [
        "-y",
        "-f",
        "lavfi",
        "-i",
        `color=c=0x16191A:s=270x480:d=${seconds}:r=24`,
        "-f",
        "lavfi",
        "-i",
        `anullsrc=r=44100:cl=mono:d=${seconds}`,
        "-c:v",
        "libx264",
        "-preset",
        "ultrafast",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-shortest",
        target,
      ],
      { timeout: 60_000 },
    );

    const bytes = await fsp.readFile(target);
    return { ok: true, filename: `${label}.mp4`, bytes };
  } catch {
    return {
      ok: false,
      reason: "יצירת קובץ הווידאו לדמו נכשלה. אפשר לצרף MP4 ידנית בעמוד הייבוא.",
    };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}
