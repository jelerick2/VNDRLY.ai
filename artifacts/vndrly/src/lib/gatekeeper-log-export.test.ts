import { describe, expect, it, vi } from "vitest";

import type { VisitorRow } from "@/lib/visits-api";
import { buildExcelXml, buildWordHtml, latestVisitForPlate, normalizePlate, toGateLogRows } from "./gatekeeper-log-export";

vi.setSystemTime(new Date("2026-08-22T12:00:00Z"));

function visit(overrides: Partial<VisitorRow> = {}): VisitorRow {
  return {
    id: 1,
    firstName: "Taylor",
    lastName: "Reed",
    company: "Acme & Sons",
    phone: "555-0100",
    email: "taylor@example.com",
    vehiclePlate: "TX-ABC 123",
    platePhotoUrl: null,
    vehiclePhotoUrl: null,
    purpose: "Delivery <priority>",
    expectedDurationMinutes: 60,
    hostType: "partner",
    hostPartnerId: 10,
    hostVendorId: null,
    hostPartnerName: "Baker",
    hostVendorName: null,
    siteLocationId: 20,
    siteName: "Rig One",
    siteCode: "SITE-ABC12345",
    checkInTime: "2026-08-22T10:00:00Z",
    checkOutTime: null,
    autoCheckedOut: false,
    checkInLatitude: 31,
    checkInLongitude: -102,
    ...overrides,
  };
}

describe("gatekeeper plate history", () => {
  it("normalizes punctuation and returns the newest exact plate match", () => {
    const older = visit({ id: 1, checkInTime: "2026-08-20T10:00:00Z" });
    const newer = visit({ id: 2, vehiclePlate: "TXABC123", checkInTime: "2026-08-21T10:00:00Z" });
    expect(normalizePlate(" tx abc-123 ")).toBe("TXABC123");
    expect(latestVisitForPlate([older, newer], "tx-abc 123")?.id).toBe(2);
    expect(latestVisitForPlate([older], "TXABC12")).toBeNull();
  });
});

describe("gatekeeper log exports", () => {
  it("maps visit history and escapes Office document markup", () => {
    const rows = toGateLogRows([visit()]);
    expect(rows[0]).toMatchObject({ plate: "TX-ABC 123", visitor: "Taylor Reed", status: "On site" });
    const excel = buildExcelXml(rows);
    const word = buildWordHtml(rows);
    expect(excel).toContain("Acme &amp; Sons");
    expect(excel).toContain("Delivery &lt;priority&gt;");
    expect(word).toContain("Acme &amp; Sons");
    expect(word).not.toContain("Delivery <priority>");
  });
});
