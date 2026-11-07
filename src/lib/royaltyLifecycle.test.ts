import { describe, expect, it } from "vitest";
import { computeRoyalty, royaltyStatus, unpaidRoyalty } from "./royaltyLifecycle";

describe("royalty lifecycle", () => {
  it("separates sent from paid", () => {
    expect(royaltyStatus({ finalized_at: "2026-11-07", sent_at: "2026-11-07", paid_at: null })).toBe("Skickad");
    expect(unpaidRoyalty([{ paid_at: null, payable_incl_vat: 625 }, { paid_at: "2026-11-07", payable_incl_vat: 100 }])).toBe(625);
  });
  it("deducts recoup once and carries balances below 500 SEK", () => {
    expect(computeRoyalty(100, 600, 200, [{ description: "Recoup", amount: 450 }], 0.25, 500)).toEqual({ expenses: 450, payable: 0, vat: 0, incl: 0, outstanding: 450 });
  });
  it("keeps frozen statement numbers separate from later income", () => {
    const saved = computeRoyalty(0, 1000, 0, [], 0.25, 500);
    const updated = computeRoyalty(0, 2000, 0, [], 0.25, 500);
    expect(saved.incl).toBe(1250);
    expect(updated.incl).toBe(2500);
  });
});