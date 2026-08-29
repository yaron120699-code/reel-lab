import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * The Vercel failure this guards against: two serverless functions each seed
 * their own empty `/tmp` database, and a link minted by one has to resolve in
 * the other. That only works if both produce the same ids.
 */

let workDir: string;

beforeAll(() => {
  workDir = fs.mkdtempSync(path.join(os.tmpdir(), "baderech-seed-"));
  process.env.STORAGE_DIR = path.join(workDir, "uploads");
  process.env.ANALYSIS_PROVIDER = "fixture";
});

afterAll(() => {
  fs.rmSync(workDir, { recursive: true, force: true });
});

async function seedFreshDatabase(name: string) {
  const { createDatabase } = await import("@/lib/db/client");
  const { createSqliteRepositories } = await import("@/lib/repositories/sqlite");
  const { seedCanonicalDemo } = await import("@/lib/demo/seed");

  const db = createDatabase(path.join(workDir, `${name}.db`));
  const repos = createSqliteRepositories(db);
  const counts = await seedCanonicalDemo(repos);
  return { db, repos, counts };
}

describe("the canonical demo seed", () => {
  it("produces the same ids in two independent databases", async () => {
    const first = await seedFreshDatabase("instance-a");
    const second = await seedFreshDatabase("instance-b");

    const idsOf = async (repos: Awaited<ReturnType<typeof seedFreshDatabase>>["repos"]) => {
      const items = await repos.reels.list();
      return items.map((item) => item.reel.id).sort();
    };

    const a = await idsOf(first.repos);
    const b = await idsOf(second.repos);

    expect(a).toHaveLength(6);
    expect(a).toEqual(b);

    // Every id is stable and namespaced, not a random uuid.
    for (const id of a) expect(id.startsWith("demo-reel-")).toBe(true);

    first.db.close();
    second.db.close();
  });

  it("lets a link minted in one database resolve in the other", async () => {
    const first = await seedFreshDatabase("link-a");
    const second = await seedFreshDatabase("link-b");

    const listed = await first.repos.reels.list();
    for (const item of listed) {
      // This is exactly what /reels/[id] does after following a link from /reels.
      const resolved = await second.repos.reels.findById(item.reel.id);
      expect(resolved, `reel ${item.reel.shortCode} should resolve in a sibling instance`).not.toBeNull();
    }

    first.db.close();
    second.db.close();
  });

  it("seeds a competitor, six reels, two analyses, a comparison and a pattern", async () => {
    const { db, repos, counts } = await seedFreshDatabase("counts");

    expect(counts).toEqual({
      competitors: 1,
      reels: 6,
      metrics: 6,
      analyses: 2,
      comparisons: 1,
      patterns: 1,
    });

    expect(await repos.reels.list()).toHaveLength(6);
    expect((await repos.reels.list()).filter((item) => item.analysisStatus !== "none")).toHaveLength(
      2,
    );
    expect(await repos.patterns.list()).toHaveLength(1);

    db.close();
  });

  it("is idempotent: a second run adds nothing", async () => {
    const { db, repos } = await seedFreshDatabase("idempotent");
    const { seedCanonicalDemo } = await import("@/lib/demo/seed");

    const second = await seedCanonicalDemo(repos);
    expect(second).toEqual({
      competitors: 0,
      reels: 0,
      metrics: 0,
      analyses: 0,
      comparisons: 0,
      patterns: 0,
    });

    expect(await repos.reels.list()).toHaveLength(6);
    expect(await repos.competitors.list()).toHaveLength(1);
    expect(await repos.patterns.list()).toHaveLength(1);

    db.close();
  });

  it("carries no thumbnail URLs, so nothing renders as a broken image", async () => {
    const { db, repos } = await seedFreshDatabase("thumbs");

    for (const item of await repos.reels.list()) {
      expect(item.reel.thumbnailUrl).toBeNull();
    }

    db.close();
  });

  it("keeps a missing play count missing rather than inventing one", async () => {
    const { db, repos } = await seedFreshDatabase("metrics");

    const items = await repos.reels.list();
    const archive = items.find((item) => item.reel.shortCode === "DEMOold006");
    expect(archive?.metrics?.playCount).toBeNull();
    expect(archive?.metrics?.likesCount).toBe(2900);

    db.close();
  });

  it("stores the demo comparison and pattern under their fixed ids", async () => {
    const { db, repos } = await seedFreshDatabase("links");
    const { DEMO_COMPARISON_ID, DEMO_PATTERN_ID, demoReelId } = await import(
      "@/lib/demo/fixtures"
    );

    expect(await repos.comparisons.findById(DEMO_COMPARISON_ID)).not.toBeNull();

    const pattern = await repos.patterns.findById(DEMO_PATTERN_ID);
    expect(pattern).not.toBeNull();
    expect(pattern?.comparisonId).toBe(DEMO_COMPARISON_ID);
    expect(pattern?.supportingReelIds).toEqual([
      demoReelId("DEMOhook01"),
      demoReelId("DEMOslow02"),
    ]);

    db.close();
  });
});

describe("auto-seed gating", () => {
  it("stays off locally and turns on only for a Vercel demo deployment", async () => {
    const { serverEnv } = await import("@/lib/config/env");
    const original = process.env.VERCEL;
    const originalPostgresUrl = process.env.POSTGRES_URL;

    delete process.env.VERCEL;
    delete process.env.POSTGRES_URL;
    process.env.DEMO_MODE = "true";
    expect(serverEnv.autoSeedDemo).toBe(false);

    process.env.VERCEL = "1";
    expect(serverEnv.autoSeedDemo).toBe(true);

    process.env.POSTGRES_URL = "postgres://configured.example/reel-lab";
    expect(serverEnv.autoSeedDemo).toBe(false);
    delete process.env.POSTGRES_URL;

    process.env.DEMO_MODE = "false";
    expect(serverEnv.autoSeedDemo).toBe(false);

    process.env.DEMO_MODE = "true";
    if (original === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = original;
    if (originalPostgresUrl === undefined) delete process.env.POSTGRES_URL;
    else process.env.POSTGRES_URL = originalPostgresUrl;
  });
});
