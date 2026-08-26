import { describe, expect, it } from "vitest";
import { matchGateCheckoutVisits, parseGateVoiceCommand, parseGateVoiceEntry } from "./gate-voice-entry";

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

describe("parseGateVoiceCommand", () => {
  it("understands a driver name followed by checking out", () => {
    expect(parseGateVoiceCommand("Bob Villa checking out")).toEqual({
      intent: "check-out",
      fill: { firstName: "Bob", lastName: "Villa" },
    });
  });

  it("understands a plate followed by checking out", () => {
    expect(parseGateVoiceCommand("plate 51D-4A1 checking out")).toEqual({
      intent: "check-out",
      fill: { vehiclePlate: "51D-4A1" },
    });
  });

  it("understands a natural check-in command", () => {
    expect(parseGateVoiceCommand("check in Bob Villa from Peak Energy plate ABC123 purpose delivery duration 45 minutes")).toEqual({
      intent: "check-in",
      fill: {
        firstName: "Bob",
        lastName: "Villa",
        company: "Peak Energy",
        vehiclePlate: "ABC123",
        purpose: "delivery",
        expectedDuration: "45",
      },
    });
  });

  it("captures the purpose for a first-time company in natural speech", () => {
    expect(parseGateVoiceCommand("check in Bob Villa from NewCo plate ABC123 for equipment delivery")).toEqual({
      intent: "check-in",
      fill: {
        firstName: "Bob",
        lastName: "Villa",
        company: "NewCo",
        vehiclePlate: "ABC123",
        purpose: "equipment delivery",
      },
    });
  });

  it("understands with-company and here-for phrasing", () => {
    expect(parseGateVoiceCommand("Bob Villa with NewCo plate ABC123 checking in here for inspection")).toEqual({
      intent: "check-in",
      fill: {
        firstName: "Bob",
        lastName: "Villa",
        company: "NewCo",
        vehiclePlate: "ABC123",
        purpose: "inspection",
      },
    });
  });
});

describe("matchGateCheckoutVisits", () => {
  const visits = [
    { id: 1, firstName: "Bob", lastName: "Villa", company: "Peak Energy", vehiclePlate: "51D-4A1", checkInTime: "2026-08-25T16:00:00Z" },
    { id: 2, firstName: "Alice", lastName: "Jones", company: "Peak Energy", vehiclePlate: "ABC123", checkInTime: "2026-08-25T17:00:00Z" },
  ];

  it("finds an active visit by full name or normalized plate", () => {
    expect(matchGateCheckoutVisits(visits, { firstName: "Bob", lastName: "Villa" }).map((visit) => visit.id)).toEqual([1]);
    expect(matchGateCheckoutVisits(visits, { vehiclePlate: "51d4a1" }).map((visit) => visit.id)).toEqual([1]);
  });
});
