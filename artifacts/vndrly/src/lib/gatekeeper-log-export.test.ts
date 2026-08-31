import { describe, expect, it, vi } from "vitest";

import type { VisitorRow } from "@/lib/visits-api";
const pdf = vi.hoisted(() => ({
  addPage: vi.fn(),
  rect: vi.fn(),
  save: vi.fn(),
  text: vi.fn(),
}));

vi.mock("jspdf", () => ({
  jsPDF: class {
    internal = {
      pageSize: {
        getHeight: () => 612,
        getWidth: () => 792,
      },
    };
    addPage = pdf.addPage;
    rect = pdf.rect;
    save = pdf.save;
    text = pdf.text;
    setFillColor() {}
    setFont() {}
    setFontSize() {}
    splitTextToSize(value: string) { return [value]; }
  },
}));

import { buildExcelXml, buildWordHtml, exportPdf, latestVisitForPlate, normalizePlate, toGateLogRows } from "./gatekeeper-log-export";

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
    plateState: "TX",
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
    expect(latestVisitForPlate([older, newer], "TX", "tx-abc 123")?.id).toBe(2);
    expect(latestVisitForPlate([older], "TX", "TXABC12")).toBeNull();
  });

  it("prefers the exact composite key, permits legacy fallback, and excludes another state", () => {
    const exact = visit({ id: 3, vehiclePlate: "4412", plateState: "TX", checkInTime: "2026-08-20T10:00:00Z" });
    const legacy = visit({ id: 4, vehiclePlate: "44-12", plateState: null, checkInTime: "2026-08-22T10:00:00Z" });
    const wrongState = visit({ id: 5, vehiclePlate: "4412", plateState: "OK", checkInTime: "2026-08-23T10:00:00Z" });

    expect(latestVisitForPlate([legacy, wrongState, exact], "TX", "4412")?.id).toBe(3);
    expect(latestVisitForPlate([legacy, wrongState], "TX", "4412")?.id).toBe(4);
    expect(latestVisitForPlate([wrongState], "TX", "4412")).toBeNull();
  });

  it("resolves a previous visit from plate number when state is still unknown", () => {
    const prior = visit({ id: 6, vehiclePlate: "4412", plateState: "OK" });

    expect(latestVisitForPlate([prior], null, "4412")?.id).toBe(6);
    expect(latestVisitForPlate([prior], "OK", "")).toBeNull();
  });
});

describe("gatekeeper log exports", () => {
  it("maps visit history and escapes Office document markup", () => {
    const rows = toGateLogRows([visit()]);
    expect(rows[0]).toMatchObject({ plateState: "TX", plateNumber: "TX-ABC 123", visitor: "Taylor Reed", status: "On site" });
    const excel = buildExcelXml(rows);
    const word = buildWordHtml(rows);
    expect(excel).toContain("Acme &amp; Sons");
    expect(excel).toContain("Delivery &lt;priority&gt;");
    expect(word).toContain("Acme &amp; Sons");
    expect(word).not.toContain("Delivery <priority>");
  });

  it("exports plate state and number in distinct columns and leaves legacy state blank", () => {
    const rows = toGateLogRows([
      visit({ id: 1, vehiclePlate: "ABC123", plateState: "TX" }),
      visit({ id: 2, vehiclePlate: "LEGACY7", plateState: null }),
    ]);

    expect(rows.map(({ plateState, plateNumber }) => ({ plateState, plateNumber }))).toEqual([
      { plateState: "TX", plateNumber: "ABC123" },
      { plateState: "", plateNumber: "LEGACY7" },
    ]);
    const excel = buildExcelXml(rows);
    const word = buildWordHtml(rows);
    expect(excel).toContain("Plate State");
    expect(excel).toContain("Plate Number");
    expect(word).toContain("Plate State");
    expect(word).toContain("Plate Number");
  });

  it("draws state and number into separate PDF cells and leaves the legacy state cell blank", async () => {
    pdf.text.mockClear();
    pdf.save.mockClear();
    const rows = toGateLogRows([
      visit({ id: 1, vehiclePlate: "ABC123", plateState: "TX" }),
      visit({ id: 2, vehiclePlate: "LEGACY7", plateState: null }),
    ]);

    await exportPdf(rows);

    const drawnText = pdf.text.mock.calls.map(([value]) =>
      Array.isArray(value) ? value.join("") : value,
    );
    expect(drawnText.slice(1, 3)).toEqual(["Plate State", "Plate Number"]);
    expect(drawnText.slice(13, 15)).toEqual(["TX", "ABC123"]);
    expect(drawnText.slice(25, 27)).toEqual(["", "LEGACY7"]);
    expect(pdf.save).toHaveBeenCalledWith("vndrly-gate-log.pdf");
  });
});
