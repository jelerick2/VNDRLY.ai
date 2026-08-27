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

  it.each([
    ["TX plate ABC 123 driver Bob Villa", "TX"],
    ["Texas, plate ABC 123 driver Bob Villa", "TX"],
    ["state IN plate ABC 123 driver Bob Villa", "IN"],
    ["state OR tag ABC 123 driver Bob Villa", "OR"],
    ["state ME license plate ABC 123 driver Bob Villa", "ME"],
    ["state OK plate ABC 123 driver Bob Villa", "OK"],
    ["state HI tag ABC 123 driver Bob Villa", "HI"],
    ["state ID license plate ABC 123 driver Bob Villa", "ID"],
  ])("extracts a precisely cued state without contaminating the plate from %s", (transcript, code) => {
    expect(parseGateVoiceEntry(transcript)).toMatchObject({
      plateState: code,
      vehiclePlate: "ABC123",
    });
  });

  it.each([
    "IN plate ABC 123 driver Bob Villa",
    "OR plate ABC 123 driver Bob Villa",
    "ME plate ABC 123 driver Bob Villa",
    "OK plate ABC 123 driver Bob Villa",
    "HI plate ABC 123 driver Bob Villa",
    "ID plate ABC 123 driver Bob Villa",
    "check in plate ABC 123 driver Bob Villa",
    "ZZ plate ABC 123 driver Bob Villa",
  ])(
    "does not infer an uncued or invalid state from %s",
    (transcript) => {
      const parsed = parseGateVoiceEntry(transcript);
      expect(parsed).not.toHaveProperty("plateState");
      expect(parsed.vehiclePlate).toBe("ABC123");
    },
  );

  it("does not confuse ordinary words or plate prefixes with a state", () => {
    expect(parseGateVoiceEntry("plate TXABC123 driver Texas Bob")).toEqual({
      vehiclePlate: "TXABC123",
      firstName: "Texas",
      lastName: "Bob",
    });
  });
});
