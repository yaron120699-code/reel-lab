import { describe, expect, it } from "vitest";

import {
  extractApifyItems,
  normalizeApifyPayload,
  normalizeApifyText,
} from "@/lib/apify/normalize";

const FULL_ITEM = {
  url: "https://www.instagram.com/reel/Cx1y2z3AbC/",
  shortCode: "Cx1y2z3AbC",
  caption: "עצרנו באמצע הכביש",
  timestamp: "2026-05-14T17:20:00.000Z",
  videoDuration: 46.2,
  videoPlayCount: 412000,
  likesCount: 18400,
  commentsCount: 512,
  transcript: "עצרנו את הרכב באמצע הכביש",
  videoUrl: "https://cdn.example.invalid/a.mp4",
  displayUrl: "https://cdn.example.invalid/a.jpg",
  ownerUsername: "lior.demo.reels",
  hashtags: ["#מסע", "צפון"],
};

describe("extractApifyItems", () => {
  it("accepts a bare item, an array, and an items envelope", () => {
    expect(extractApifyItems(FULL_ITEM)).toHaveLength(1);
    expect(extractApifyItems([FULL_ITEM, FULL_ITEM])).toHaveLength(2);
    expect(extractApifyItems({ items: [FULL_ITEM] })).toHaveLength(1);
  });
});

describe("normalizeApifyPayload", () => {
  it("maps the documented Apify fields onto the reel shape", () => {
    const result = normalizeApifyPayload([FULL_ITEM]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const reel = result.reels[0];
    expect(reel.shortCode).toBe("Cx1y2z3AbC");
    expect(reel.sourceUrl).toBe(FULL_ITEM.url);
    expect(reel.caption).toBe("עצרנו באמצע הכביש");
    expect(reel.publishedAt).toBe("2026-05-14T17:20:00.000Z");
    expect(reel.durationSeconds).toBeCloseTo(46.2);
    expect(reel.playCount).toBe(412000);
    expect(reel.likesCount).toBe(18400);
    expect(reel.commentsCount).toBe(512);
    expect(reel.remoteVideoUrl).toBe(FULL_ITEM.videoUrl);
    expect(reel.thumbnailUrl).toBe(FULL_ITEM.displayUrl);
    expect(reel.ownerUsername).toBe("lior.demo.reels");
  });

  it("strips the leading hash from hashtags", () => {
    const result = normalizeApifyPayload([FULL_ITEM]);
    if (!result.ok) throw new Error("expected success");
    expect(result.reels[0].tags).toEqual(["מסע", "צפון"]);
  });

  it("records which source field produced each metric", () => {
    const result = normalizeApifyPayload([FULL_ITEM]);
    if (!result.ok) throw new Error("expected success");
    expect(result.reels[0].provenance).toMatchObject({
      playCount: "videoPlayCount",
      likesCount: "likesCount",
      durationSeconds: "videoDuration",
      publishedAt: "timestamp",
      transcript: "transcript",
    });
  });

  it("falls back through play count aliases and records the one it used", () => {
    const result = normalizeApifyPayload([
      { ...FULL_ITEM, videoPlayCount: undefined, videoViewCount: 91000 },
    ]);
    if (!result.ok) throw new Error("expected success");
    expect(result.reels[0].playCount).toBe(91000);
    expect(result.reels[0].provenance.playCount).toBe("videoViewCount");
  });

  it("leaves a missing metric null rather than defaulting it to zero", () => {
    const result = normalizeApifyPayload([
      { ...FULL_ITEM, videoPlayCount: undefined, commentsCount: undefined },
    ]);
    if (!result.ok) throw new Error("expected success");

    const reel = result.reels[0];
    expect(reel.playCount).toBeNull();
    expect(reel.commentsCount).toBeNull();
    expect(reel.provenance.playCount).toBeNull();
    expect(reel.warnings.some((warning) => warning.includes("צפיות"))).toBe(true);
  });

  it("keeps an explicit zero, which is a real measurement", () => {
    const result = normalizeApifyPayload([{ ...FULL_ITEM, likesCount: 0 }]);
    if (!result.ok) throw new Error("expected success");
    expect(result.reels[0].likesCount).toBe(0);
  });

  it("derives the shortCode from the URL when the field is absent", () => {
    const { shortCode, ...withoutShortCode } = FULL_ITEM;
    void shortCode;
    const result = normalizeApifyPayload([withoutShortCode]);
    if (!result.ok) throw new Error("expected success");
    expect(result.reels[0].shortCode).toBe("Cx1y2z3AbC");
  });

  it("reads both unix-second and millisecond timestamps", () => {
    const seconds = normalizeApifyPayload([
      { ...FULL_ITEM, timestamp: undefined, takenAtTimestamp: 1778000000 },
    ]);
    if (!seconds.ok) throw new Error("expected success");
    expect(seconds.reels[0].publishedAt).toBe(new Date(1778000000 * 1000).toISOString());

    const millis = normalizeApifyPayload([
      { ...FULL_ITEM, timestamp: undefined, takenAtTimestamp: 1778000000000 },
    ]);
    if (!millis.ok) throw new Error("expected success");
    expect(millis.reels[0].publishedAt).toBe(new Date(1778000000000).toISOString());
  });

  it("joins a segmented transcript into one string", () => {
    const result = normalizeApifyPayload([
      { ...FULL_ITEM, transcript: [{ text: "שורה ראשונה" }, { text: "שורה שנייה" }] },
    ]);
    if (!result.ok) throw new Error("expected success");
    expect(result.reels[0].transcript).toBe("שורה ראשונה שורה שנייה");
  });

  it("parses numeric strings with separators", () => {
    const result = normalizeApifyPayload([{ ...FULL_ITEM, likesCount: "18,400" }]);
    if (!result.ok) throw new Error("expected success");
    expect(result.reels[0].likesCount).toBe(18400);
  });

  it("skips unidentifiable items but keeps the good ones", () => {
    const result = normalizeApifyPayload([FULL_ITEM, { caption: "no url, no shortCode" }]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.reels).toHaveLength(1);
    expect(result.skipped).toHaveLength(1);
    expect(result.skipped[0].index).toBe(1);
  });

  it("fails when nothing in the payload is identifiable", () => {
    const result = normalizeApifyPayload([{ caption: "nothing here" }]);
    expect(result.ok).toBe(false);
  });
});

describe("normalizeApifyText", () => {
  it("reports invalid JSON with an actionable message", () => {
    const result = normalizeApifyText("{ not json");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("JSON");
  });

  it("reports an empty paste", () => {
    const result = normalizeApifyText("   ");
    expect(result.ok).toBe(false);
  });

  it("round-trips a stringified array", () => {
    const result = normalizeApifyText(JSON.stringify([FULL_ITEM]));
    expect(result.ok).toBe(true);
  });
});
