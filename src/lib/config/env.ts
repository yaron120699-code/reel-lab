import "@/lib/server-only";

import path from "node:path";

/**
 * Central, server-only environment access.
 *
 * Nothing in this module may be imported from a Client Component. Secret values
 * (APIFY_API_TOKEN, ANALYSIS_API_KEY) are never returned to callers that render
 * UI — only the boolean `*Configured` flags are safe to send to the browser.
 */

function readString(name: string, fallback: string): string {
  const raw = process.env[name];
  return raw === undefined || raw.trim() === "" ? fallback : raw.trim();
}

function readBoolean(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === "") return fallback;
  return ["1", "true", "yes", "on"].includes(raw.trim().toLowerCase());
}

function absolute(p: string): string {
  return path.isAbsolute(p) ? p : path.join(process.cwd(), p);
}

export type AnalysisProviderId = "fixture" | "anthropic" | "gemini";

/** Every provider that performs a real model call. `fixture` is the offline default. */
export const LIVE_ANALYSIS_PROVIDERS = ["anthropic", "gemini"] as const;

function readAnalysisProvider(): AnalysisProviderId {
  const raw = readString("ANALYSIS_PROVIDER", "fixture").toLowerCase();
  // An unrecognised value falls back to `fixture` rather than failing loudly:
  // a typo should leave the lab offline and honest, not half-configured.
  return (LIVE_ANALYSIS_PROVIDERS as readonly string[]).includes(raw)
    ? (raw as AnalysisProviderId)
    : "fixture";
}

export const serverEnv = {
  get demoMode(): boolean {
    return readBoolean("DEMO_MODE", true);
  },
  /** Vercel sets VERCEL=1 in every runtime it controls. */
  get isVercel(): boolean {
    return process.env.VERCEL === "1";
  },
  /**
   * True only where the filesystem is ephemeral and per-instance. Locally the
   * SQLite file persists, so nothing is auto-seeded and the person stays in
   * control of their own data.
   */
  get autoSeedDemo(): boolean {
    return this.demoMode && process.env.VERCEL === "1" && this.postgresUrl === null;
  },
  get databaseFile(): string {
    const raw = readString("DATABASE_FILE", "./data/app.db");
    return raw === ":memory:" ? raw : absolute(raw);
  },
  /** Supabase/Vercel server-only pooled connection string. */
  get postgresUrl(): string | null {
    const raw = readString("POSTGRES_URL", "");
    return raw === "" ? null : raw;
  },
  get storageDir(): string {
    return absolute(readString("STORAGE_DIR", "./data/uploads"));
  },
  get analysisProvider(): AnalysisProviderId {
    return readAnalysisProvider();
  },
  get analysisModel(): string {
    return readString("ANALYSIS_MODEL", "claude-sonnet-4-5");
  },
  /** Secret. Only ever read inside the analysis provider implementation. */
  get analysisApiKey(): string | null {
    const raw = readString("ANALYSIS_API_KEY", "");
    return raw === "" ? null : raw;
  },
  /** Secret. Only ever read inside the Apify client. */
  get apifyApiToken(): string | null {
    const raw = readString("APIFY_API_TOKEN", "");
    return raw === "" ? null : raw;
  },
};

/**
 * The only environment-derived shape that is safe to pass into the browser.
 * Booleans only — no key material, no lengths, no prefixes.
 */
export type PublicRuntimeFlags = {
  demoMode: boolean;
  apifyConfigured: boolean;
  liveAnalysisConfigured: boolean;
  analysisProvider: AnalysisProviderId;
  /** Data is rebuilt per instance and does not survive. Drives the UI banner. */
  ephemeralDemo: boolean;
};

export function publicRuntimeFlags(): PublicRuntimeFlags {
  return {
    demoMode: serverEnv.demoMode,
    apifyConfigured: serverEnv.apifyApiToken !== null,
    liveAnalysisConfigured:
      serverEnv.analysisProvider !== "fixture" && serverEnv.analysisApiKey !== null,
    analysisProvider: serverEnv.analysisProvider,
    ephemeralDemo: serverEnv.autoSeedDemo,
  };
}
