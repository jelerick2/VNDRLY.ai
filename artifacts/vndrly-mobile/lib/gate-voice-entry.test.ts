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

  it.each([
    ["TX plate ABC 123 driver Bob Villa", "TX"],
    ["Texas, plate ABC 123 driver Bob Villa", "TX"],
    ["state IN plate ABC 123 driver Bob Villa", "IN"],
    ["state OR tag ABC 123 driver Bob Villa", "OR"],
    ["state ME license plate ABC 123 driver Bob Villa", "ME"],
    ["state OK plate ABC 123 driver Bob Villa", "OK"],
    ["state HI tag ABC 123 driver Bob Villa", "HI"],
    ["state ID license plate ABC 123 driver Bob Villa", "ID"],
    ["state OH plate ABC 123 driver Bob Villa", "OH"],
    ["Ohio, plate ABC 123 driver Bob Villa", "OH"],
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
    "OH plate ABC 123 driver Bob Villa",
    "Oh, plate ABC 123 driver Bob Villa",
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

  it("does not treat a plate prefix or driver name as state input", () => {
    expect(parseGateVoiceEntry("plate TXABC123 driver Texas Bob")).toEqual({
      vehiclePlate: "TXABC123",
      firstName: "Texas",
      lastName: "Bob",
    });
  });
});
