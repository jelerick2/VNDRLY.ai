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
});
