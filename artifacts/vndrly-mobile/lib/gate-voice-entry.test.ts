import { describe, expect, it } from "vitest";
import { parseGateVoiceEntry } from "./gate-voice-entry";

describe("parseGateVoiceEntry", () => {
  it("extracts plate and driver from the minimum spoken command", () => {
    expect(parseGateVoiceEntry("license plate ok 4412 driver Bob Villa")).toEqual({
      vehiclePlate: "OK4412",
      firstName: "Bob",
      lastName: "Villa",
    });
  });

  it("extracts a full state name and keeps the plate number separate", () => {
    expect(parseGateVoiceEntry("Texas plate ABC 123 driver Bob Villa")).toEqual({
      plateState: "TX",
      vehiclePlate: "ABC123",
      firstName: "Bob",
      lastName: "Villa",
    });
  });

  it("accepts a state code but ignores an invalid code", () => {
    expect(parseGateVoiceEntry("tx plate ABC 123 driver Bob Villa")).toMatchObject({
      plateState: "TX",
      vehiclePlate: "ABC123",
    });
    expect(parseGateVoiceEntry("ZZ plate ABC 123 driver Bob Villa")).not.toHaveProperty("plateState");
  });

  it("does not treat a plate prefix or driver name as state input", () => {
    expect(parseGateVoiceEntry("plate TXABC123 driver Texas Bob")).toEqual({
      vehiclePlate: "TXABC123",
      firstName: "Texas",
      lastName: "Bob",
    });
  });
});
