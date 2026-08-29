import "@/lib/server-only";

import postgres from "postgres";

import { serverEnv } from "@/lib/config/env";

import { POSTGRES_SCHEMA_SQL } from "./postgres-schema";

export type PostgresDb = ReturnType<typeof postgres>;

let cached: PostgresDb | null = null;
let cachedUrl: string | null = null;
let schemaPromise: Promise<void> | null = null;

export function getPostgresDb(): PostgresDb {
  const url = serverEnv.postgresUrl;
  if (url === null) throw new Error("POSTGRES_URL is not configured.");
  if (cached && cachedUrl === url) return cached;

  cached = postgres(url, {
    max: 4,
    prepare: false,
    connect_timeout: 10,
    idle_timeout: 20,
    ssl: "require",
  });
  cachedUrl = url;
  schemaPromise = null;
  return cached;
}

/** Apply only additive, idempotent DDL once per server process. */
export async function ensurePostgresSchema(db: PostgresDb = getPostgresDb()): Promise<void> {
  if (!schemaPromise) {
    schemaPromise = db.unsafe(POSTGRES_SCHEMA_SQL).then(() => undefined);
  }
  await schemaPromise;
}
