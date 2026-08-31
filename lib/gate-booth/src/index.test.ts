import { describe, expect, it } from "vitest";
import {
  evaluateGpsFence,
  formatFenceMilesSentence,
  GATE_DURATION_CHIPS,
  minutesForDurationChip,
  onSiteDwell,
  siteDisplayName,
  siteLabelExposesCode,
  sortSitesByNameAndDistance,
  trimVisitNotes,
} from "./index";

describe("evaluateGpsFence", () => {
  const site = { latitude: 32.8, longitude: -96.8, siteRadiusMeters: 1609 };

  it("stays searching with no submit while GPS is acquiring", () => {
    const status = evaluateGpsFence({
      gps: "searching",
      origin: null,
      site,
    });
    expect(status).toMatchObject({
      gps: "searching",
      milesToSite: null,
      radiusMiles: 1,
      insideFence: false,
      canSubmit: false,
    });
    expect(formatFenceMilesSentence(status)).toEqual({
      kind: "searching",
      miles: null,
      radius: "1",
    });
  });

  it("reports denied without inventing a distance", () => {
    const status = evaluateGpsFence({
      gps: "denied",
      origin: null,
      site,
    });
    expect(status.canSubmit).toBe(false);
    expect(formatFenceMilesSentence(status).kind).toBe("denied");
  });

  it("still reports miles when locked but outside the fence", () => {
    const status = evaluateGpsFence({
      gps: "locked",
      origin: { latitude: 32.9, longitude: -96.8 },
      site,
    });
    expect(status.insideFence).toBe(false);
    expect(status.canSubmit).toBe(false);
    expect(status.milesToSite).toBeGreaterThan(1);
    expect(formatFenceMilesSentence(status)).toMatchObject({
      kind: "tooFar",
      radius: "1",
    });
    expect(Number(formatFenceMilesSentence(status).miles)).toBeGreaterThan(1);
  });

  it("allows submit only when locked inside the selected site fence", () => {
    const status = evaluateGpsFence({
      gps: "locked",
      origin: { latitude: 32.801, longitude: -96.801 },
      site,
    });
    expect(status.insideFence).toBe(true);
    expect(status.canSubmit).toBe(true);
    expect(formatFenceMilesSentence(status).kind).toBe("inside");
  });

  it("cannot submit without a selected site even when GPS is locked", () => {
    const status = evaluateGpsFence({
      gps: "locked",
      origin: { latitude: 32.8, longitude: -96.8 },
      site: null,
    });
    expect(status.canSubmit).toBe(false);
    expect(formatFenceMilesSentence(status).kind).toBe("noSite");
  });
});

describe("site name picker", () => {
  const sites = [
    { id: 2, name: "West Pad", latitude: 32.9, longitude: -96.9, siteCode: "SITE-BBBBBBBB" },
    { id: 1, name: "East Pad", latitude: 32.801, longitude: -96.801, siteCode: "SITE-AAAAAAAA" },
  ];

  it("sorts by distance when GPS is known and labels by name only", () => {
    const ranked = sortSitesByNameAndDistance(sites, {
      latitude: 32.8,
      longitude: -96.8,
    });
    expect(ranked.map((row) => siteDisplayName(row))).toEqual(["East Pad", "West Pad"]);
    expect(ranked.every((row) => !siteLabelExposesCode(siteDisplayName(row)))).toBe(true);
    expect(ranked[0].distanceMeters).not.toBeNull();
  });

  it("sorts by name when GPS is unknown", () => {
    const ranked = sortSitesByNameAndDistance(sites, null);
    expect(ranked.map((row) => row.name)).toEqual(["East Pad", "West Pad"]);
  });

  it("treats SITE-XXXXXXXX as a code humans should not see", () => {
    expect(siteLabelExposesCode("SITE-B40D77D2")).toBe(true);
    expect(siteLabelExposesCode("East Pad")).toBe(false);
  });
});

describe("visit notes and duration", () => {
  it("trims freeform notes and treats blank as absent", () => {
    expect(trimVisitNotes("  mud on the bumper  ")).toBe("mud on the bumper");
    expect(trimVisitNotes("   ")).toBeNull();
    expect(trimVisitNotes(null)).toBeNull();
  });

  it("caps notes so voice dumps cannot overflow the visit", () => {
    const notes = trimVisitNotes("x".repeat(4000));
    expect(notes).toHaveLength(2000);
  });

  it("maps duration chips without blocking custom minutes", () => {
    expect(GATE_DURATION_CHIPS.map((chip) => chip.id)).toEqual([
      "30m",
      "2h",
      "allDay",
      "overnight",
    ]);
    expect(minutesForDurationChip("30m")).toBe(30);
    expect(minutesForDurationChip("2h")).toBe(120);
    expect(minutesForDurationChip("allDay")).toBe(600);
    expect(minutesForDurationChip("overnight")).toBe(720);
  });
});

describe("onSiteDwell", () => {
  it("reports minutes on site and overdue past the expected window", () => {
    const now = Date.parse("2026-08-28T15:00:00Z");
    expect(
      onSiteDwell({
        checkInTime: "2026-08-28T14:10:00Z",
        expectedDurationMinutes: 30,
        nowMs: now,
      }),
    ).toEqual({ minutesOnSite: 50, overdue: true, overdueMinutes: 20 });
    expect(
      onSiteDwell({
        checkInTime: "2026-08-28T14:40:00Z",
        expectedDurationMinutes: 60,
        nowMs: now,
      }),
    ).toEqual({ minutesOnSite: 20, overdue: false, overdueMinutes: 0 });
  });
});
