import { describe, expect, it } from "vitest";
import {
  formatPlate,
  formatPlateForDisplay,
  normalizePlateNumber,
  normalizePlateState,
  orderPlateStates,
  plateMatchKey,
  plateMatchesSearch,
  reconcileAutomatedPlateUpdate,
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

  it("marks a legacy plate while preserving the shared state-qualified presentation", () => {
    expect(formatPlateForDisplay("TX", "abc-1234", "State unconfirmed")).toBe(
      "TX • ABC-1234",
    );
    expect(formatPlateForDisplay(null, "legacy7", "State unconfirmed")).toBe(
      "LEGACY7 (State unconfirmed)",
    );
    expect(formatPlateForDisplay(null, null, "State unconfirmed")).toBeNull();
  });

  it("matches the same plate within a state while preserving state boundaries", () => {
    expect(plateMatchKey("TX", "ABC-1234")).toBe("TX:ABC1234");
    expect(plateMatchKey("OK", "ABC-1234")).toBe("OK:ABC1234");
    expect(plateMatchKey("TX", "")).toBeNull();
  });

  it("treats a space-delimited state prefix as a search qualifier", () => {
    expect(plateMatchesSearch("TX", "ABC-123", "TX ABC123")).toBe(true);
    expect(plateMatchesSearch("OK", "ABC-123", "TX ABC123")).toBe(false);
  });

  it("keeps hyphen, slash, and underscore prefixes as literal plate punctuation", () => {
    expect(plateMatchesSearch("OK", "TX-991", "TX-991")).toBe(true);
    expect(plateMatchesSearch("OK", "CA/204", "CA/204")).toBe(true);
    expect(plateMatchesSearch("OK", "NY_77", "NY_77")).toBe(true);
  });
});

describe("automated plate-state provenance", () => {
  it("clears a manual state when automation changes plate without a valid state", () => {
    expect(
      reconcileAutomatedPlateUpdate({
        currentPlate: "OLD-123",
        currentState: "OK",
        automatedPlate: "NEW-456",
        automatedState: null,
      }),
    ).toEqual({ vehiclePlate: "NEW-456", plateState: null });
  });

  it("preserves a manual state when automation reports the same normalized plate", () => {
    expect(
      reconcileAutomatedPlateUpdate({
        currentPlate: "abc-123",
        currentState: "OK",
        automatedPlate: "ABC 123",
        automatedState: "ZZ",
      }),
    ).toEqual({ vehiclePlate: "ABC 123", plateState: "OK" });
  });

  it("replaces both fields when automation supplies a valid state", () => {
    expect(
      reconcileAutomatedPlateUpdate({
        currentPlate: "OLD-123",
        currentState: "OK",
        automatedPlate: "new-456",
        automatedState: "tx",
      }),
    ).toEqual({ vehiclePlate: "NEW-456", plateState: "TX" });
  });
});

describe("orderPlateStates", () => {
  it("filters the complete state catalog by name", () => {
    expect(
      orderPlateStates(["OK", "TX"], "tex").map((state) => state.code),
    ).toEqual(["TX"]);
  });

  it("keeps preferred states first and alphabetizes every remaining state", () => {
    const ordered = orderPlateStates(["TX", "OK"], "");

    expect(ordered.slice(0, 2).map((state) => state.code)).toEqual([
      "TX",
      "OK",
    ]);
    expect(ordered).toHaveLength(US_PLATE_STATES.length);
    expect(new Set(ordered.map((state) => state.code))).toHaveLength(
      US_PLATE_STATES.length,
    );
    expect(ordered.slice(2).map((state) => state.name)).toEqual(
      [...ordered.slice(2).map((state) => state.name)].sort((left, right) =>
        left.localeCompare(right),
      ),
    );
  });
});
