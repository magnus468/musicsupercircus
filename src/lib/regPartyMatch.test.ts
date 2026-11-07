import { describe, expect, it } from "vitest";
import type { WorkRegistration } from "@/hooks/useWorkRegistrations";
import { normalizePublisherName, resolveBrfNameWarning, resolvePublisherNameWarnings, normalizeCreatorName, creatorNamesMatch, resolveCreatorNameWarnings, lookupRegInfo } from "./regPartyMatch";

const registration = {
  share_mismatch: true,
  mismatch_note: "Brf Music Publishing 16.66% finns inte på verket i katalogen",
} as WorkRegistration;

describe("Case-insensitive STIM party names", () => {
  it.each(["Sf Studios", "SF Studios", "sf studios", "SF STUDIOS"])("ignores casing for %s with matching shares", (name) => {
    const reg = { ...registration, mismatch_note: `${name} 16.66% finns inte på verket i katalogen` };
    expect(resolvePublisherNameWarnings(reg, "SF Studios (E, 16.66%, repr)").share_mismatch).toBe(false);
  });
  it("applies to other publishers and creators too", () => {
    expect(resolvePublisherNameWarnings({ ...registration, mismatch_note: "MISO FILMMUSIK SVERIGE 16.66% finns inte på verket i katalogen" }, "Miso Filmmusik Sverige (E, 16.66%, repr)").share_mismatch).toBe(false);
    expect(resolveCreatorNameWarnings({ ...registration, mismatch_note: "GAUTE STORAAS: STIM 66.67% / andel saknas i katalogen" }, "Gaute Storaas (CA, 66.67%, repr)").share_mismatch).toBe(false);
  });
  it("preserves real share differences, missing parties, ambiguity and identifier conflicts", () => {
    const reg = { ...registration, mismatch_note: "Sf Studios 16.66% finns inte på verket i katalogen" };
    expect(resolvePublisherNameWarnings(reg, "SF Studios (E, 16.67%, repr)").share_mismatch).toBe(true);
    expect(resolvePublisherNameWarnings(reg, "FLX (E, 16.66%, repr)").share_mismatch).toBe(true);
    expect(resolvePublisherNameWarnings(reg, "SF Studios (E, 16.66%, repr), Sf Studios (E, 16.66%, repr)").share_mismatch).toBe(true);
    expect(resolvePublisherNameWarnings({ ...reg, mismatch_note: `${reg.mismatch_note}; IPI-konflikt` }, "SF Studios (E, 16.66%, repr)").mismatch_note).toBe("IPI-konflikt");
  });
});

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

describe("Current publisher shares against old receipt warnings", () => {
  const receipt = (name = "Music Super Circus Extravaganza", perf = 20): WorkRegistration => ({
    ...registration,
    publishers: [{ name, perf, mech: perf, role: "E", ipi: "624193850", agreement: "3753498" }],
    mismatch_note: `${name}: STIM ${perf}% / katalog 16.67%`,
  });
  it("clears a stale numeric warning only after the catalog now agrees", () => {
    expect(resolvePublisherNameWarnings(receipt(), "Music Super Circus Extravaganza AB (E, 20%, row:30%, repr)").share_mismatch).toBe(false);
    expect(resolvePublisherNameWarnings(receipt(), "Music Super Circus Extravaganza AB (E, 16.67%, repr)").share_mismatch).toBe(true);
  });
  it("identifies a generic MSC name using the receipt identifier, keeping the publishers separate", () => {
    expect(resolvePublisherNameWarnings(receipt("MUSIC SUPER CIRCUS"), "Music Super Circus Extravaganza AB (E, 20%, repr)").share_mismatch).toBe(false);
    expect(resolvePublisherNameWarnings(receipt("MUSIC SUPER CIRCUS"), "Music Super Circus Publishing (E, 20%, repr)").share_mismatch).toBe(true);
  });
  it("keeps contradictory internal publisher identifiers", () => {
    const reg = receipt("MUSIC SUPER CIRCUS");
    reg.publishers[0].agreement = "13995144";
    expect(resolvePublisherNameWarnings(reg, "Music Super Circus Extravaganza (E, 20%, repr)").share_mismatch).toBe(true);
  });
  it("clears a legacy name with the exact receipt IPI appended", () => {
    const reg = { ...receipt("Filmlance International Ab", 16.66), mismatch_note: "FILMLANCE INTERNATIONAL 690366230 16.66% finns inte på verket i katalogen" };
    reg.publishers[0].ipi = "690366230";
    expect(resolvePublisherNameWarnings(reg, "Filmlance International (E, 16.66%, repr)").share_mismatch).toBe(false);
  });
  it("keeps mechanical differences and ambiguous receipt publishers", () => {
    const reg = receipt();
    reg.publishers[0].mech = 15;
    expect(resolvePublisherNameWarnings(reg, "Music Super Circus Extravaganza (E, 20%, repr)").share_mismatch).toBe(true);
    const ambiguous = receipt();
    ambiguous.publishers.push({ ...ambiguous.publishers[0] });
    expect(resolvePublisherNameWarnings(ambiguous, "Music Super Circus Extravaganza (E, 20%, repr)").share_mismatch).toBe(true);
  });
  it("leaves unrelated conflicts and ROW untouched", () => {
    const reg = { ...receipt(), mismatch_note: `${receipt().mismatch_note}; IPI-konflikt` };
    expect(resolvePublisherNameWarnings(reg, "Music Super Circus Extravaganza (E, 20%, row:15%, repr)").mismatch_note).toBe("IPI-konflikt");
  });
});

describe("STIM middle names", () => {
  const receipt = (name: string, perf = 33.34, ipi = "285562339"): WorkRegistration => ({
    ...registration,
    creators: [{ name, role: "CA", ipi, perf, mech: perf }],
    mismatch_note: `${name}: STIM ${perf}% / andel saknas i katalogen`,
  });
  it.each([
    ["Tom van Heesch", "Tom Christoffer Van Heesch"],
    ["Nicolas Elgstrand", "Nicolas Alexander Elgstrand"],
    ["Magnus Palmborg", "Magnus Bengt Gunnar Palmborg"],
    ["Gunnar Palmborg", "Magnus Bengt Gunnar Palmborg"],
  ])("links %s to %s in either direction", (short, full) => {
    expect(creatorNamesMatch(short, full)).toBe(true);
    expect(creatorNamesMatch(full, short)).toBe(true);
    expect(resolveCreatorNameWarnings(receipt(full), `${short} (CA, 33.34%, repr)`).share_mismatch).toBe(false);
    expect(lookupRegInfo(short, [receipt(full)], false).ipi).toBe("285562339");
  });
  it("preserves genuine share differences and unrelated warnings", () => {
    const reg = receipt("Tom Christoffer Van Heesch");
    expect(resolveCreatorNameWarnings(reg, "Tom van Heesch (CA, 33.33%, repr)").share_mismatch).toBe(true);
    expect(resolveCreatorNameWarnings({ ...reg, mismatch_note: `${reg.mismatch_note}; SF Studios 16.66% finns inte på verket i katalogen` }, "Tom van Heesch (CA, 33.34%, repr)").mismatch_note).toBe("SF Studios 16.66% finns inte på verket i katalogen");
  });
  it("does not match surname alone, different given names or different surnames", () => {
    expect(creatorNamesMatch("Heesch", "Tom Christoffer Van Heesch")).toBe(false);
    expect(creatorNamesMatch("Thomas van Heesch", "Tom Christoffer Van Heesch")).toBe(false);
    expect(creatorNamesMatch("Tom Smith", "Tom Christoffer Van Heesch")).toBe(false);
  });
  it("keeps ambiguous catalog and receipt matches for review", () => {
    const reg = receipt("Tom van Heesch");
    expect(resolveCreatorNameWarnings(reg, "Tom Christoffer van Heesch (CA, 33.34%, repr), Tom Alexander van Heesch (CA, 33.34%, repr)").share_mismatch).toBe(true);
    const ambiguous = { ...receipt("Tom Christoffer van Heesch"), creators: [...receipt("Tom Christoffer van Heesch").creators, ...receipt("Tom Alexander van Heesch", 33.34, "999").creators] };
    expect(resolveCreatorNameWarnings(ambiguous, "Tom van Heesch (CA, 33.34%, repr)").share_mismatch).toBe(true);
    expect(lookupRegInfo("Tom van Heesch", [ambiguous], false).ipi).toBeNull();
  });
  it("keeps conflicting IPI numbers across receipts", () => {
    expect(lookupRegInfo("Tom van Heesch", [receipt("Tom Christoffer Van Heesch"), receipt("Tom van Heesch", 33.34, "999")], false).ipi).toBeNull();
  });
});

describe("Adam Nordén aliases", () => {
  it("recognizes Adam Isaac Erik Norden as Adam Nordén", () => {
    expect(normalizeCreatorName("Adam Isaac Erik Norden")).toBe(normalizeCreatorName("Adam Nordén"));
  });
  it("resolves a stale comparison only when the actual share matches", () => {
    const reg = { ...registration, mismatch_note: "Adam Isaac Erik Norden: STIM 66.67% / katalog 33.33%" };
    expect(resolveCreatorNameWarnings(reg, "Adam Nordén (CA, 66.67%, repr)").share_mismatch).toBe(false);
    expect(resolveCreatorNameWarnings(reg, "Adam Nordén (CA, 33.33%, repr)").share_mismatch).toBe(true);
  });
  it("retains unrelated warnings", () => {
    const reg = { ...registration, mismatch_note: "Trad: STIM 0.0% / katalog 33.33%; Adam Isaac Erik Norden: STIM 66.67% / katalog 33.33%" };
    expect(resolveCreatorNameWarnings(reg, "Adam Nordén (CA, 66.67%, repr)").mismatch_note).toBe("Trad: STIM 0.0% / katalog 33.33%");
  });
  it("looks up identifiers in both name directions", () => {
    for (const [catalog, stim] of [["Adam Nordén", "Adam Isaac Erik Norden"], ["Adam Isaac Erik Norden", "Adam Nordén"]]) {
      expect(lookupRegInfo(catalog, [{ ...registration, creators: [{ name: stim, role: "CA", ipi: "123", perf: 66.67, mech: null }] }], false).ipi).toBe("123");
    }
  });
});

describe("Harry Harrysson name change", () => {
  const receipt = (name: string, ipi = "123"): WorkRegistration => ({
    ...registration,
    creators: [{ name, role: "CA", ipi, perf: 33.33, mech: 33.33 }],
    mismatch_note: `${name}: STIM 33.33% / andel saknas i katalogen`,
  });
  it.each([
    ["Harry Harrysson", "Johan Hugo Harrysson"],
    ["Johan Hugo Harrysson", "HARRY HARRYSSON"],
  ])("recognizes %s and %s without a name-only warning", (catalog, stim) => {
    expect(creatorNamesMatch(catalog, stim)).toBe(true);
    expect(resolveCreatorNameWarnings(receipt(stim), `${catalog} (CA, 33.33%, repr)`).share_mismatch).toBe(false);
    expect(lookupRegInfo(catalog, [receipt(stim)], false).ipi).toBe("123");
  });
  it("preserves different shares, unrelated identities and identifier conflicts", () => {
    expect(resolveCreatorNameWarnings(receipt("Johan Hugo Harrysson"), "Harry Harrysson (CA, 50%, repr)").share_mismatch).toBe(true);
    expect(creatorNamesMatch("Harry Harrysson", "Johan Harrysson")).toBe(false);
    expect(lookupRegInfo("Harry Harrysson", [receipt("Harry Harrysson"), receipt("Johan Hugo Harrysson", "456")], false).ipi).toBeNull();
    const reg = receipt("Johan Hugo Harrysson");
    expect(resolveCreatorNameWarnings({ ...reg, mismatch_note: `${reg.mismatch_note}; IPI-konflikt` }, "Harry Harrysson (CA, 33.33%, repr)").mismatch_note).toBe("IPI-konflikt");
  });
});

describe("Karzan Mahmood aliases", () => {
  it("recognizes Karzan Mahmood Faqe Hussein as Karzan Mahmood", () => {
    expect(normalizeCreatorName("Karzan Mahmood Faqe Hussein")).toBe(normalizeCreatorName("Karzan Mahmood"));
  });
  it("resolves only the verified name warning", () => {
    const reg = { ...registration, mismatch_note: "Karzan Mahmood Faqe Hussein: STIM 3.33% / andel saknas i katalogen" };
    expect(resolveCreatorNameWarnings(reg, "Karzan Mahmood (CA, 3.33%, repr)").share_mismatch).toBe(false);
    expect(resolveCreatorNameWarnings(reg, "Karzan Mahmood (CA, 22.22%, repr)").share_mismatch).toBe(true);
  });
  it("retains other parties' issues", () => {
    const reg = { ...registration, mismatch_note: "Karzan Mahmood Faqe Hussein: STIM 3.33% / andel saknas i katalogen; SF Studios 16.66% finns inte på verket i katalogen" };
    expect(resolveCreatorNameWarnings(reg, "Karzan Mahmood (CA, 3.33%, repr)").mismatch_note).toBe("SF Studios 16.66% finns inte på verket i katalogen");
  });
  it("looks up identifiers in both directions and preserves conflicting identifiers", () => {
    const receipt = (name: string, ipi: string): WorkRegistration => ({ ...registration, creators: [{ name, role: "CA", ipi, perf: 3.33, mech: null }] });
    expect(lookupRegInfo("Karzan Mahmood Faqe Hussein", [receipt("Karzan Mahmood", "123")], false).ipi).toBe("123");
    expect(lookupRegInfo("Karzan Mahmood", [receipt("Karzan Mahmood Faqe Hussein", "123")], false).ipi).toBe("123");
    expect(lookupRegInfo("Karzan Mahmood", [receipt("Karzan Mahmood", "123"), receipt("Karzan Mahmood Faqe Hussein", "456")], false).ipi).toBeNull();
  });
});