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

export async function getAnalysisProvider(): Promise<AnalysisProvider> {
  if (serverEnv.analysisProvider === "anthropic" && serverEnv.analysisApiKey !== null) {
    const { createAnthropicAnalysisProvider } = await import("./providers/anthropic");
    return createAnthropicAnalysisProvider();
  }
  const { createFixtureAnalysisProvider } = await import("./providers/fixture");
  return createFixtureAnalysisProvider();
}
