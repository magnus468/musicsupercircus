import { describe, expect, it } from "vitest";
import { buildMatchWorkSearch } from "./matchWorkSearch";

describe("free settlement work search", () => {
  it("allows title and creator words to match different fields", () => {
    expect(buildMatchWorkSearch("Answers Elvis")).toBe('and(or(title.ilike."%Answers%",creators.ilike."%Answers%",project.ilike."%Answers%"),or(title.ilike."%Elvis%",creators.ilike."%Elvis%",project.ilike."%Elvis%"))');
  });
  it("allows a creator name without a title", () => {
    expect(buildMatchWorkSearch("  Nordén  ")).toBe('and(or(title.ilike."%Nordén%",creators.ilike."%Nordén%",project.ilike."%Nordén%"))');
  });
  it("keeps commas, parentheses and quotes from becoming query operators", () => {
    expect(buildMatchWorkSearch('A,(B)"')).toBe('and(or(title.ilike."%A,(B)\\"%",creators.ilike."%A,(B)\\"%",project.ilike."%A,(B)\\"%"))');
  });
});