import { describe, expect, it } from "vitest";

import { FIXTURE_ANALYSES } from "@/lib/analysis/fixtures/analyses";
import {
  buildEvidenceLedger,
  findingSchema,
  listFindingSchema,
  parseAnalysisPayload,
  timelineFindingSchema,
} from "@/lib/analysis/schema";

describe("measured findings", () => {
  it("must name the imported field they came from", () => {
    const withSource = findingSchema.safeParse({
      value: "עברית",
      evidence: "measured",
      sourceField: "transcript",
    });
    expect(withSource.success).toBe(true);

    const withoutSource = findingSchema.safeParse({ value: "עברית", evidence: "measured" });
    expect(withoutSource.success).toBe(false);
  });

  it("cannot carry a confidence level, because data is not a reading", () => {
    const result = findingSchema.safeParse({
      value: "46 שניות",
      evidence: "measured",
      sourceField: "videoDuration",
      confidence: "high",
    });
    expect(result.success).toBe(false);
  });
});

describe("observed findings", () => {
  it("carry neither a source field nor a confidence level", () => {
    expect(findingSchema.safeParse({ value: "משפט פתיחה", evidence: "observed" }).success).toBe(
      true,
    );
    expect(
      findingSchema.safeParse({ value: "משפט פתיחה", evidence: "observed", confidence: "high" })
        .success,
    ).toBe(false);
    expect(
      findingSchema.safeParse({
        value: "משפט פתיחה",
        evidence: "observed",
        sourceField: "caption",
      }).success,
    ).toBe(false);
  });

  it("may carry a free-text note such as a timestamp", () => {
    const result = findingSchema.safeParse({
      value: "משפט פתיחה",
      evidence: "observed",
      note: "0:00–0:03",
    });
    expect(result.success).toBe(true);
  });
});

describe("inferred findings", () => {
  it("must state a confidence level", () => {
    expect(
      findingSchema.safeParse({ value: "מנגנון סתירה", evidence: "inferred" }).success,
    ).toBe(false);
    expect(
      findingSchema.safeParse({ value: "מנגנון סתירה", evidence: "inferred", confidence: "low" })
        .success,
    ).toBe(true);
  });

  it("cannot claim an imported source field", () => {
    const result = findingSchema.safeParse({
      value: "מנגנון סתירה",
      evidence: "inferred",
      confidence: "medium",
      sourceField: "videoPlayCount",
    });
    expect(result.success).toBe(false);
  });
});

describe("the rules apply to list and timeline findings too", () => {
  it("enforces confidence on an inferred list", () => {
    expect(listFindingSchema.safeParse({ items: ["א"], evidence: "inferred" }).success).toBe(false);
    expect(
      listFindingSchema.safeParse({ items: ["א"], evidence: "inferred", confidence: "high" })
        .success,
    ).toBe(true);
  });

  it("enforces a source field on a measured timeline", () => {
    const beats = [{ at: "0:00", label: "פתיחה", description: "תיאור" }];
    expect(timelineFindingSchema.safeParse({ beats, evidence: "measured" }).success).toBe(false);
    expect(
      timelineFindingSchema.safeParse({ beats, evidence: "measured", sourceField: "transcript" })
        .success,
    ).toBe(true);
  });
});

describe("evidence ledger", () => {
  it("counts every field exactly once", () => {
    const parsed = parseAnalysisPayload(FIXTURE_ANALYSES.DEMOhook01);
    if (!parsed.ok) throw new Error(parsed.issues.join(" | "));

    const ledger = buildEvidenceLedger(parsed.payload);
    expect(ledger.total).toBe(17);
    expect(ledger.measured + ledger.observed + ledger.inferred).toBe(ledger.total);
  });

  it("always counts retention on the inferred side", () => {
    const parsed = parseAnalysisPayload(FIXTURE_ANALYSES.DEMOslow02);
    if (!parsed.ok) throw new Error(parsed.issues.join(" | "));

    const ledger = buildEvidenceLedger(parsed.payload);
    expect(parsed.payload.retentionMechanisms.evidence).toBe("inferred");
    expect(ledger.inferred).toBeGreaterThan(0);
  });

  it("reflects a reclassified field", () => {
    const parsed = parseAnalysisPayload(FIXTURE_ANALYSES.DEMOhook01);
    if (!parsed.ok) throw new Error(parsed.issues.join(" | "));

    const before = buildEvidenceLedger(parsed.payload);
    const changed = structuredClone(parsed.payload);
    changed.tone = { value: changed.tone.value, evidence: "inferred", confidence: "low" };

    const after = buildEvidenceLedger(changed);
    expect(after.observed).toBe(before.observed - 1);
    expect(after.inferred).toBe(before.inferred + 1);
  });
});
