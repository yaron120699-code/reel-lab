import "@/lib/server-only";

import { serverEnv } from "@/lib/config/env";
import { getRepositories } from "@/lib/repositories";
import type { Repositories } from "@/lib/repositories/types";

import { DEMO_COMPETITOR_ID } from "./fixtures";
import { seedCanonicalDemo } from "./seed";

/**
 * On Vercel every serverless function gets its own empty `/tmp`, and it is
 * wiped when the instance is recycled. There is no moment at which the database
 * is "already seeded" from the app's point of view, so seeding cannot be a
 * one-off step a person triggers — each function has to be able to rebuild the
 * dataset for itself, on demand, before it reads anything.
 *
 * The promise is cached per process so a warm instance pays the cost once.
 */
let inFlight: Promise<void> | null = null;

async function seedOnce(): Promise<void> {
  const repos = getRepositories();

  // Fast path: the competitor's id is fixed, so one lookup answers whether this
  // particular database already holds the dataset.
  const existing = await repos.competitors.findById(DEMO_COMPETITOR_ID);
  if (existing) return;

  await seedCanonicalDemo(repos);
}

export async function ensureDemoData(): Promise<void> {
  if (!serverEnv.autoSeedDemo) return;

  if (!inFlight) {
    inFlight = seedOnce().catch((error) => {
      // Let the next request retry rather than caching a failure forever. A
      // page with no demo data is recoverable; a permanently poisoned cache is
      // not.
      inFlight = null;
      throw error;
    });
  }

  await inFlight;
}

/**
 * Repository accessor for anything that reads data during a request. It waits
 * for the demo dataset to exist before handing the repositories over, so no
 * page can render a half-seeded database.
 */
export async function getReadyRepositories(): Promise<Repositories> {
  await ensureDemoData();
  return getRepositories();
}

/** Test seam: forget the cached seed promise. */
export function resetDemoSeedCache(): void {
  inFlight = null;
}
