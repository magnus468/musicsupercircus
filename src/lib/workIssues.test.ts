import { describe, expect, it } from "vitest";
import { detectIssues } from "./workIssues";

const work = {
  id: "a2016ace-8ff5-447d-a3ce-25c4d82eab66",
  creators: "Joakim Åhlund (CA, 75%, row:60%, repr), Music Super Circus Publishing (E, 12.50%, row:20%, repr), BRF Music Publishing (E, 12.50%, row:20%, repr)",
  project: "Jävla karlar (Original Motion Picture Soundtrack)",
  co_publishers: ["Music Super Circus Publishing", "BRF Music Publishing"],
};
const names = new Set(["B-Reel Films AB"]);

describe("explicit publishing agreement links", () => {
  it("accepts the B-Reel link despite the BRF name without requiring an Åhlund agreement", () => {
    expect(detectIssues(work, names, new Set([work.id]))).not.toContain("no_agreement");
  });
  it("keeps missing-agreement warnings for works without their own link", () => {
    expect(detectIssues(work, names, new Set(["another-work"]))).toContain("no_agreement");
  });
  it("does not hide other issues when an agreement is linked", () => {
    expect(detectIssues({ ...work, project: null }, names, new Set([work.id]))).toEqual(["no_project"]);
  });
  it("retains the existing publisher-name fallback", () => {
    expect(detectIssues({ ...work, co_publishers: ["B-Reel Films AB"] }, names)).not.toContain("no_agreement");
  });
});