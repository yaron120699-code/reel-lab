import fs from "node:fs";
import path from "node:path";

import Database from "better-sqlite3";

import { SCHEMA_SQL, SCHEMA_VERSION } from "./schema";

export type Db = Database.Database;

let cached: Db | null = null;
let cachedPath: string | null = null;

function resolveDatabaseFile(): string {
  const raw = process.env.DATABASE_FILE?.trim();
  if (raw === ":memory:") return ":memory:";
  const value = raw && raw !== "" ? raw : "./data/app.db";
  return path.isAbsolute(value) ? value : path.join(process.cwd(), value);
}

export function applySchema(db: Db): void {
  db.exec(SCHEMA_SQL);
  db.pragma(`user_version = ${SCHEMA_VERSION}`);
}

export function createDatabase(file: string): Db {
  if (file !== ":memory:") {
    fs.mkdirSync(path.dirname(file), { recursive: true });
  }
  const db = new Database(file);
  db.pragma("foreign_keys = ON");
  applySchema(db);
  return db;
}

/**
 * Process-wide connection. Next.js keeps modules alive across requests in dev,
 * so the handle is cached and reused rather than reopened per request.
 */
export function getDb(): Db {
  const file = resolveDatabaseFile();
  if (cached && cachedPath === file) return cached;
  if (cached) cached.close();
  cached = createDatabase(file);
  cachedPath = file;
  return cached;
}

export function closeDb(): void {
  if (cached) {
    cached.close();
    cached = null;
    cachedPath = null;
  }
}
