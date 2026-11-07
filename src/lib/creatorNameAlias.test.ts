import { describe, expect, it } from "vitest";
import { canonicalCreatorAlias } from "../../supabase/functions/_shared/creatorNameAlias";

describe("confirmed Harry Harrysson alias in nightly updates", () => {
  it("canonicalizes both confirmed names without changing other people", () => {
    expect(canonicalCreatorAlias("Johan Hugo Harrysson")).toBe("harry harrysson");
    expect(canonicalCreatorAlias("HARRY HARRYSSON")).toBe("harry harrysson");
    expect(canonicalCreatorAlias("Johan Harrysson")).toBe("Johan Harrysson");
    expect(canonicalCreatorAlias("Harry Svensson")).toBe("Harry Svensson");
  });
});