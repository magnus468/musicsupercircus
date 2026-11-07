import { describe, expect, it } from "vitest";
import { isOwnRecordingShare } from "./royaltyRecipient";

describe("recording royalty recipient roles", () => {
  it("separates Music Super Circus's own share from client payouts", () => {
    expect(isOwnRecordingShare("Music Super Circus")).toBe(true);
    expect(isOwnRecordingShare("Embark Studios")).toBe(false);
  });
  it("does not reclassify other recipients through partial name matching", () => {
    expect(isOwnRecordingShare(" music super circus ")).toBe(true);
    expect(isOwnRecordingShare("Music Super Circus Publishing")).toBe(false);
  });
});