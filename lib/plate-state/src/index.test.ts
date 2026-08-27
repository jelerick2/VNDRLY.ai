import { describe, expect, it } from "vitest";
import {
  formatPlate,
  normalizePlateNumber,
  normalizePlateState,
  orderPlateStates,
  plateMatchKey,
  US_PLATE_STATES,
} from "./index";

describe("normalizePlateState", () => {
  it("accepts full state names and case-insensitive USPS abbreviations", () => {
    expect(normalizePlateState("Texas")).toBe("TX");
    expect(normalizePlateState(" ok ")).toBe("OK");
  });

  it("rejects unknown or blank states", () => {
    expect(normalizePlateState("ZZ")).toBeNull();
    expect(normalizePlateState(" ")).toBeNull();
  });
});

describe("plate formatting and matching", () => {
  it("formats an entered plate for display", () => {
    expect(formatPlate("TX", "abc-1234")).toBe("TX • ABC-1234");
    expect(normalizePlateNumber(" abc-1234 ")).toBe("ABC-1234");
  });

  it("matches the same plate within a state while preserving state boundaries", () => {
    expect(plateMatchKey("TX", "ABC-1234")).toBe("TX:ABC1234");
    expect(plateMatchKey("OK", "ABC-1234")).toBe("OK:ABC1234");
    expect(plateMatchKey("TX", "")).toBeNull();
  });
});

describe("orderPlateStates", () => {
  it("filters the complete state catalog by name", () => {
    expect(orderPlateStates(["OK", "TX"], "tex").map((state) => state.code)).toEqual([
      "TX",
    ]);
  });

  it("keeps preferred states first and alphabetizes every remaining state", () => {
    const ordered = orderPlateStates(["TX", "OK"], "");

    expect(ordered.slice(0, 2).map((state) => state.code)).toEqual(["TX", "OK"]);
    expect(ordered).toHaveLength(US_PLATE_STATES.length);
    expect(new Set(ordered.map((state) => state.code))).toHaveLength(US_PLATE_STATES.length);
    expect(ordered.slice(2).map((state) => state.name)).toEqual(
      [...ordered.slice(2).map((state) => state.name)].sort((left, right) =>
        left.localeCompare(right),
      ),
    );
  });
});
