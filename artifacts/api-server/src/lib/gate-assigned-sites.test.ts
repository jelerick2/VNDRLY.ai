import { describe, expect, it } from "vitest";

import {
  assembleAssignedGateSites,
  pickDefaultAssignedSite,
} from "./gate-assigned-sites";

const spur = {
  id: 309,
  name: "Flywheel Energy Spur",
  address: "34.63951, -97.66194",
  siteCode: "SITE-B40D77D2",
  latitude: 34.63951,
  longitude: -97.66194,
};

const older = {
  id: 10,
  name: "Older Pad",
  address: "1 Main St",
  siteCode: "SITE-OLD",
  latitude: 35,
  longitude: -97,
};

describe("assembleAssignedGateSites", () => {
  it("returns sites newest-assignment first and skips hidden or inactive rows", () => {
    const sites = assembleAssignedGateSites(
      [
        { id: 1, siteLocationId: older.id },
        { id: 8, siteLocationId: spur.id },
        { id: 3, siteLocationId: older.id },
      ],
      [
        older,
        spur,
        { ...spur, id: 400, name: "Hidden", hidden: true, siteCode: "SITE-HID" },
        { ...spur, id: 401, name: "Inactive", isActive: false, siteCode: "SITE-OFF" },
      ],
    );
    expect(sites.map((site) => site.siteCode)).toEqual(["SITE-B40D77D2", "SITE-OLD"]);
    expect(sites[0]?.assignmentId).toBe(8);
    expect(sites[1]?.assignmentId).toBe(3);
  });

  it("returns an empty list when the vendor has no assignments", () => {
    expect(assembleAssignedGateSites([], [spur])).toEqual([]);
  });
});

describe("pickDefaultAssignedSite", () => {
  it("uses the newest assignment as the current location", () => {
    const sites = assembleAssignedGateSites(
      [
        { id: 1, siteLocationId: older.id },
        { id: 8, siteLocationId: spur.id },
      ],
      [older, spur],
    );
    expect(pickDefaultAssignedSite(sites)?.siteCode).toBe("SITE-B40D77D2");
  });

  it("returns null when nothing is assigned", () => {
    expect(pickDefaultAssignedSite([])).toBeNull();
  });
});
