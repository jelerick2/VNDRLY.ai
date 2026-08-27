import { describe, expect, it } from "vitest";
import { rankPreferredPlateStates } from "./plate-state-ranking";

describe("rankPreferredPlateStates", () => {
  it("ranks recent confirmed states by count and abbreviation", () => {
    expect(rankPreferredPlateStates(
      [
        { state: "OK", count: 8 },
        { state: "TX", count: 12 },
        { state: "NM", count: 8 },
        { state: "ZZ", count: 99 },
      ],
      [],
      ["CA", "TX", "NY", "FL", "OH"],
    )).toEqual(["TX", "NM", "OK", "CA", "NY"]);
  });

  it("keeps every recent state ahead of higher-count historical states", () => {
    expect(rankPreferredPlateStates(
      [{ state: "OK", count: 1 }],
      [
        { state: "TX", count: 40 },
        { state: "NM", count: 20 },
      ],
      ["CA", "TX", "NY", "FL", "OH"],
    )).toEqual(["OK", "TX", "NM", "CA", "NY"]);
  });

  it("suppresses duplicate and invalid states across history and fallback", () => {
    expect(rankPreferredPlateStates(
      [{ state: "TX", count: 8 }],
      [
        { state: "TX", count: 30 },
        { state: "ok", count: 12 },
        { state: "XX", count: 50 },
      ],
      ["TX", "OK", "ZZ", "CA", "NY", "FL"],
    )).toEqual(["TX", "OK", "CA", "NY", "FL"]);
  });

  it("returns exactly the national fallback for a site with no confirmed visits", () => {
    expect(rankPreferredPlateStates(
      [],
      [],
      ["CA", "TX", "NY", "FL", "OH"],
    )).toEqual(["CA", "TX", "NY", "FL", "OH"]);
  });
});
