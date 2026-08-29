import { getDb } from "@/lib/db/client";

import { createSqliteRepositories } from "./sqlite";
import type { Repositories } from "./types";

export type { Repositories } from "./types";

/**
 * Swapping SQLite for Supabase is a one-line change here plus a second
 * implementation of `Repositories`. No page, component or service imports a
 * database driver directly.
 */
export function getRepositories(): Repositories {
  return createSqliteRepositories(getDb());
}
