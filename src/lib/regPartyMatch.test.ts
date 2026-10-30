import { describe, expect, it } from "vitest";
import type { WorkRegistration } from "@/hooks/useWorkRegistrations";
import { normalizePublisherName, resolveBrfNameWarning } from "./regPartyMatch";

const registration = {
  share_mismatch: true,
  mismatch_note: "Brf Music Publishing 16.66% finns inte på verket i katalogen",
} as WorkRegistration;

describe("BRF publisher aliases", () => {
  it.each(["BRF", "Brf", "BRF Music Publishing"])("recognizes %s as the same publisher", (name) => {
    expect(normalizePublisherName(name)).toBe("brf music publishing");
  });
  it.each(["BRF", "Brf", "BRF Music Publishing"])("removes only the verified name warning for %s", (name) => {
    expect(resolveBrfNameWarning(registration, `Andreas Tengblad (CA, 66.67%, repr), ${name} (E, 16.66%, row:25%, repr)`).share_mismatch).toBe(false);
  });
  it("retains real share differences", () => {
    expect(resolveBrfNameWarning(registration, "BRF (E, 16.67%, repr)").share_mismatch).toBe(true);
  });
  it("retains a warning when BRF is missing", () => {
    expect(resolveBrfNameWarning(registration, "Miso Filmmusik Sverige (E, 16.66%, repr)").share_mismatch).toBe(true);
  });
  it("does not hide additional conflicts", () => {
    expect(resolveBrfNameWarning({ ...registration, mismatch_note: `${registration.mismatch_note}; annan andelsavvikelse` }, "BRF (E, 16.66%, repr)").share_mismatch).toBe(true);
  });
});