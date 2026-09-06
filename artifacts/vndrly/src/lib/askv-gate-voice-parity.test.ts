import { describe, expect, it } from "vitest";
import {
  gateFillToAskVCheckIn,
  matchAskVCheckoutVisits,
  missingAskVCheckInFields,
} from "./askv-gate-voice-parity";

const visits = [
  { id: 1, firstName: "Bob", lastName: "Villa", company: "Peak Energy", vehiclePlate: "51D-4A1" },
  { id: 2, firstName: "Alice", lastName: "Jones", company: "Peak Energy", vehiclePlate: "ABC123" },
];

describe("AskV Gate Voice parity", () => {
  it("maps a spoken check-in onto AskV prepare fields", () => {
    const args = gateFillToAskVCheckIn(
      {
        firstName: "Bob",
        lastName: "Villa",
        company: "Peak Energy",
        vehiclePlate: "ABC123",
        purpose: "delivery",
        expectedDuration: "45",
      },
      { siteLocationId: 9, hostType: "vendor" },
    );
    expect(missingAskVCheckInFields(args)).toEqual([]);
    expect(args).toMatchObject({
      firstName: "Bob",
      lastName: "Villa",
      company: "Peak Energy",
      vehiclePlate: "ABC123",
      purpose: "delivery",
      expectedDurationMinutes: 45,
    });
  });

  it("reports missing check-in fields instead of committing", () => {
    expect(missingAskVCheckInFields(gateFillToAskVCheckIn({ vehiclePlate: "ABC123" }))).toEqual([
      "firstName",
      "lastName",
      "siteLocationId",
      "hostType",
    ]);
  });

  it("finds a unique checkout visit by name or plate", () => {
    expect(matchAskVCheckoutVisits(visits, { firstName: "Bob", lastName: "Villa" }).map((visit) => visit.id)).toEqual([1]);
    expect(matchAskVCheckoutVisits(visits, { vehiclePlate: "51d4a1" }).map((visit) => visit.id)).toEqual([1]);
  });

  it("marks ambiguous checkout matches as needing a choice", () => {
    const twins = [...visits, { id: 3, firstName: "Bob", lastName: "Villa", company: "Other", vehiclePlate: "ZZZ9" }];
    const matches = matchAskVCheckoutVisits(twins, { firstName: "Bob", lastName: "Villa" });
    expect(matches.length > 1).toBe(true);
  });

  it("reports a missing visit when checkout has no match", () => {
    expect(matchAskVCheckoutVisits(visits, { firstName: "Jane", lastName: "Doe" })).toEqual([]);
  });
});
