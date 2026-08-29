import { describe, expect, it } from "vitest";

import { FIXTURE_ANALYSES } from "@/lib/analysis/fixtures/analyses";
import {
  ANALYSIS_FIELDS,
  parseAnalysisPayload,
  reelAnalysisPayloadSchema,
  retentionFindingSchema,
} from "@/lib/analysis/schema";

function validPayload() {
  return structuredClone(FIXTURE_ANALYSES.DEMOhook01);
}

describe("analysis payload schema", () => {
  it("accepts the shipped fixtures", () => {
    for (const [shortCode, payload] of Object.entries(FIXTURE_ANALYSES)) {
      const result = parseAnalysisPayload(payload);
      if (!result.ok) throw new Error(`${shortCode}: ${result.issues.join(" | ")}`);
      expect(result.ok).toBe(true);
    }
  });

  it("requires every documented analysis field", () => {
    for (const field of ANALYSIS_FIELDS) {
      const payload = validPayload() as Record<string, unknown>;
      delete payload[field.key];
      const result = parseAnalysisPayload(payload);
      expect(result.ok, `${field.key} should be required`).toBe(false);
    }
  });

  it("rejects an unknown evidence kind", () => {
    const payload = validPayload() as Record<string, unknown>;
    payload.tone = { value: "טון", evidence: "guessed" };
    expect(parseAnalysisPayload(payload).ok).toBe(false);
  });

  it("rejects an empty timeline", () => {
    const payload = validPayload();
    payload.structureTimeline.beats = [];
    expect(reelAnalysisPayloadSchema.safeParse(payload).success).toBe(false);
  });

  it("reports issues with a readable path", () => {
    const payload = validPayload() as Record<string, unknown>;
    payload.payoff = { value: "", evidence: "observed" };
    const result = parseAnalysisPayload(payload);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.some((issue) => issue.startsWith("payoff"))).toBe(true);
  });
});

describe("retention is always inferred", () => {
  it("rejects retention marked as measured", () => {
    const payload = validPayload() as Record<string, unknown>;
    payload.retentionMechanisms = {
      items: ["עקומת שימור מהאנליטיקס"],
      evidence: "measured",
      sourceField: "retentionCurve",
    };
    const result = parseAnalysisPayload(payload);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.join(" ")).toContain("retention");
  });

  it("rejects retention marked as observed", () => {
    const result = retentionFindingSchema.safeParse({
      items: ["ראינו שאנשים נשארו"],
      evidence: "observed",
    });
    expect(result.success).toBe(false);
  });

  it("accepts retention as inferred with a confidence level", () => {
    const result = retentionFindingSchema.safeParse({
      items: ["לולאה פתוחה מוחזקת עד האמצע"],
      evidence: "inferred",
      confidence: "medium",
    });
    expect(result.success).toBe(true);
  });
});
