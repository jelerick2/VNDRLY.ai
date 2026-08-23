import { describe, expect, it } from "vitest";

import {
  GATE_HISTORY_DAYS,
  filterGateHistory,
  gateHistoryFromIso,
  visitMatchesHistorySearch,
  type GateHistoryVisit,
} from "./gate-history";

function visit(
  over: Partial<GateHistoryVisit> &
    Pick<GateHistoryVisit, "id" | "firstName" | "lastName" | "checkInTime">,
): GateHistoryVisit {
  return {
    company: null,
    vehiclePlate: null,
    purpose: null,
    hostPartnerName: null,
    hostVendorName: "MidCon",
    siteName: "Energy Spur",
    checkOutTime: null,
    ...over,
  };
}

describe("gate history window", () => {
  it("asks the API for the last 30 days", () => {
    expect(GATE_HISTORY_DAYS).toBe(30);
    const from = gateHistoryFromIso(new Date("2026-08-23T17:00:00.000Z"));
    expect(from).toBe("2026-07-24T17:00:00.000Z");
  });
});

describe("gate history search", () => {
  const rows = [
    visit({
      id: 1,
      firstName: "Pat",
      lastName: "Reyes",
      company: "Acme Wireline",
      vehiclePlate: "ABC1234",
      checkInTime: "2026-08-23T17:00:00.000Z",
    }),
    visit({
      id: 2,
      firstName: "Sam",
      lastName: "Ortiz",
      company: "Cactus",
      vehiclePlate: "TX-991",
      purpose: "Delivery",
      checkInTime: "2026-08-22T08:00:00.000Z",
    }),
  ];

  it("matches name, plate, company, and purpose", () => {
    expect(visitMatchesHistorySearch(rows[0], "reyes")).toBe(true);
    expect(visitMatchesHistorySearch(rows[0], "abc1234")).toBe(true);
    expect(visitMatchesHistorySearch(rows[0], "wireline")).toBe(true);
    expect(visitMatchesHistorySearch(rows[1], "delivery")).toBe(true);
    expect(visitMatchesHistorySearch(rows[0], "cactus")).toBe(false);
  });

  it("returns newest check-ins first", () => {
    expect(filterGateHistory([rows[1], rows[0]], "").map((row) => row.id)).toEqual([1, 2]);
  });

  it("filters then keeps newest first", () => {
    const extra = visit({
      id: 3,
      firstName: "Pat",
      lastName: "Nguyen",
      vehiclePlate: "PAT-9",
      checkInTime: "2026-08-21T12:00:00.000Z",
    });
    expect(filterGateHistory([...rows, extra], "pat").map((row) => row.id)).toEqual([1, 3]);
  });
});
