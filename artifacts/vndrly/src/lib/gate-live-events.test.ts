import { describe, expect, it } from "vitest";
import { flashFromVisitSseEvent, type KnownGateVisit } from "./gate-live-events";

const known: KnownGateVisit[] = [
  {
    id: 44,
    firstName: "Sam",
    lastName: "Ortiz",
    company: "Cactus",
    vehiclePlate: "TX-991",
    plateState: "TX",
    platePhotoUrl: "/p.jpg",
    siteName: "Energy Spur",
    siteLocationId: 309,
  },
];

describe("flashFromVisitSseEvent", () => {
  it("builds a check-in flash from the live visit payload", () => {
    const flash = flashFromVisitSseEvent(
      {
        type: "visit.checked_in",
        visit: {
          id: 12,
          firstName: "Pat",
          lastName: "Reyes",
          company: "Acme",
          vehiclePlate: "ABC1234",
          plateState: "OK",
          platePhotoUrl: "/plates/abc.jpg",
          siteName: "Energy Spur",
          siteLocationId: 309,
          checkInTime: "2026-08-23T17:00:00.000Z",
        },
      },
      { knownVisits: known, siteLocationId: 309 },
    );
    expect(flash).toEqual({
      kind: "checked_in",
      visitId: 12,
      firstName: "Pat",
      lastName: "Reyes",
      company: "Acme",
      vehiclePlate: "ABC1234",
      plateState: "OK",
      platePhotoUrl: "/plates/abc.jpg",
      siteName: "Energy Spur",
      at: "2026-08-23T17:00:00.000Z",
    });
  });

  it("builds a check-out flash from the cached on-site list when the event has no name", () => {
    const flash = flashFromVisitSseEvent(
      {
        type: "visit.checked_out",
        visitId: 44,
        siteLocationId: 309,
        checkOutTime: "2026-08-23T18:10:00.000Z",
      },
      { knownVisits: known, siteLocationId: 309 },
    );
    expect(flash?.kind).toBe("checked_out");
    expect(flash?.firstName).toBe("Sam");
    expect(flash?.vehiclePlate).toBe("TX-991");
    expect(flash?.plateState).toBe("TX");
  });

  it("ignores events for a different selected booth site", () => {
    expect(
      flashFromVisitSseEvent(
        {
          type: "visit.checked_in",
          visit: {
            id: 12,
            firstName: "Pat",
            lastName: "Reyes",
            company: null,
            vehiclePlate: null,
            plateState: null,
            platePhotoUrl: null,
            siteName: "Other",
            siteLocationId: 410,
            checkInTime: "2026-08-23T17:00:00.000Z",
          },
        },
        { knownVisits: known, siteLocationId: 309 },
      ),
    ).toBeNull();
  });
});
