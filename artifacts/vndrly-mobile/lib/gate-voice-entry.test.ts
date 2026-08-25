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
});
