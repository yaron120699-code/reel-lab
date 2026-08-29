import "@/lib/server-only";

import { serverEnv } from "@/lib/config/env";
import type { Reel } from "@/lib/domain/types";

import { ANALYSIS_PROMPT_VERSION, type ReelAnalysisPayload } from "./schema";

export type AnalysisInput = {
  reel: Reel;
  transcript: string | null;
  hasVideoFile: boolean;
  metrics: {
    playCount: number | null;
    likesCount: number | null;
    commentsCount: number | null;
  };
};

export type AnalysisResult = {
  payload: ReelAnalysisPayload;
  provider: string;
  model: string | null;
  runMode: "live" | "fixture";
  promptVersion: string;
  transcriptRef: string | null;
  language: string | null;
  analysedAt: string;
};

export interface AnalysisProvider {
  readonly id: string;
  readonly runMode: "live" | "fixture";
  readonly model: string | null;
  analyse(input: AnalysisInput): Promise<AnalysisResult>;
}

/** Thrown when no analysis can honestly be produced. Never fall back to invention. */
export class AnalysisUnavailableError extends Error {
  constructor(
    message: string,
    readonly hint: string,
  ) {
    super(message);
    this.name = "AnalysisUnavailableError";
  }
}

export { ANALYSIS_PROMPT_VERSION };

/**
 * Chooses a provider. A live provider is used only when it is both selected and
 * holds a key; otherwise the lab falls back to the offline fixture provider,
 * which refuses to invent an analysis rather than producing a plausible one.
 *
 * Implementations are imported dynamically so an unused provider's module never
 * loads, and so no secret-reading code is pulled in unless it is actually going
 * to run.
 */
export async function getAnalysisProvider(): Promise<AnalysisProvider> {
  const selected = serverEnv.analysisProvider;

  if (selected !== "fixture" && serverEnv.analysisApiKey !== null) {
    if (selected === "anthropic") {
      const { createAnthropicAnalysisProvider } = await import("./providers/anthropic");
      return createAnthropicAnalysisProvider();
    }
    if (selected === "gemini") {
      const { createGeminiAnalysisProvider } = await import("./providers/gemini");
      return createGeminiAnalysisProvider();
    }
  }

  const { createFixtureAnalysisProvider } = await import("./providers/fixture");
  return createFixtureAnalysisProvider();
}
