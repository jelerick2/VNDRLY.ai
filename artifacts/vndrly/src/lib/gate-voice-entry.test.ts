import { describe, expect, it } from "vitest";
import { parseGateVoiceEntry } from "./gate-voice-entry";

describe("parseGateVoiceEntry", () => {
  it("extracts a spoken gate entry", () => {
    expect(parseGateVoiceEntry("plate abc 123 driver Bob Villa company Peak Energy purpose delivery duration 45 minutes"))
      .toEqual({
        vehiclePlate: "ABC123",
        firstName: "Bob",
        lastName: "Villa",
        company: "Peak Energy",
        purpose: "delivery",
        expectedDuration: "45",
      });
  });

  it("extracts a full state name before the plate without changing the other fields", () => {
    expect(parseGateVoiceEntry("Texas plate ABC 123 driver Bob Villa company Peak Energy"))
      .toEqual({
        plateState: "TX",
        vehiclePlate: "ABC123",
        firstName: "Bob",
        lastName: "Villa",
        company: "Peak Energy",
      });
  });

  it("accepts state codes case-insensitively but does not manufacture invalid states", () => {
    expect(parseGateVoiceEntry("tx plate ABC 123 driver Bob Villa")).toMatchObject({
      plateState: "TX",
      vehiclePlate: "ABC123",
    });
    expect(parseGateVoiceEntry("ZZ plate ABC 123 driver Bob Villa")).toEqual({
      vehiclePlate: "ABC123",
      firstName: "Bob",
      lastName: "Villa",
    });
  });

  it("does not confuse ordinary words or plate prefixes with a state", () => {
    expect(parseGateVoiceEntry("plate TXABC123 driver Texas Bob")).toEqual({
      vehiclePlate: "TXABC123",
      firstName: "Texas",
      lastName: "Bob",
    });
  });
});
