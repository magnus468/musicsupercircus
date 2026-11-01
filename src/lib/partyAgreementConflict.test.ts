import { describe, expect, it } from "vitest";
import { hasAgreementConflict } from "../../supabase/functions/_shared/partyAgreementConflict";

const pair = new Set(["13995144", "14016020"]);

describe("MSCP agreement number review", () => {
  it("accepts 13995144 and 14016020 for MSCP outside NDQ", () => {
    expect(hasAgreementConflict("Music Super Circus Publishing", pair, [], [])).toBe(false);
    expect(hasAgreementConflict("MSCP", pair, [], [])).toBe(false);
  });

  it("retains the conflict on works with Nordic Drama Queens", () => {
    expect(hasAgreementConflict("Music Super Circus Publishing", pair,
      [{ name: "Nordic Drama Queens", role: "E" }], [])).toBe(true);
    expect(hasAgreementConflict("Music Super Circus Publishing AB", pair, [],
      [{ name: "Nordic Drama Queens AB" }])).toBe(true);
  });

  it("does not suppress other numbers or other publishers", () => {
    expect(hasAgreementConflict("Music Super Circus Publishing", new Set([...pair, "3753498"]), [], [])).toBe(true);
    expect(hasAgreementConflict("Music Super Circus Extravaganza", pair, [], [])).toBe(true);
    expect(hasAgreementConflict("Music Super Circus Publishing", new Set(["13995144", "3753498"]), [], [])).toBe(true);
  });
});