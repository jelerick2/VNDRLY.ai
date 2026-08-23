import { describe, expect, it, vi } from "vitest";

import {
  FLYWHEEL_SPUR_SITE_CODE,
  pickDefaultGateHostKey,
  pickPreferredGateDefaultSite,
  resolveAssignedGateSites,
  shouldApplyDefaultGateSite,
  type AssignedGateSite,
} from "./gate-default-site";

describe("shouldApplyDefaultGateSite", () => {
  it("applies the assigned site when the gate is still empty", () => {
    expect(
      shouldApplyDefaultGateSite({
        confirmedCode: null,
        typedCode: "",
        defaultSiteCode: FLYWHEEL_SPUR_SITE_CODE,
      }),
    ).toBe(true);
  });

  it("does not overwrite a site the gatekeeper already confirmed", () => {
    expect(
      shouldApplyDefaultGateSite({
        confirmedCode: "SITE-OLD",
        typedCode: "",
        defaultSiteCode: FLYWHEEL_SPUR_SITE_CODE,
      }),
    ).toBe(false);
  });

  it("does not steal the field while the gatekeeper is typing a code", () => {
    expect(
      shouldApplyDefaultGateSite({
        confirmedCode: null,
        typedCode: "SITE-",
        defaultSiteCode: FLYWHEEL_SPUR_SITE_CODE,
      }),
    ).toBe(false);
  });
});

describe("pickPreferredGateDefaultSite", () => {
  const spur: AssignedGateSite = {
    id: 309,
    name: "Flywheel Energy Spur",
    address: "34.63951, -97.66194",
    siteCode: FLYWHEEL_SPUR_SITE_CODE,
    latitude: 34.63951,
    longitude: -97.66194,
    assignmentId: 1,
  };
  const older: AssignedGateSite = {
    id: 10,
    name: "Older Pad",
    address: "1 Main St",
    siteCode: "SITE-OLD",
    latitude: 35,
    longitude: -97,
    assignmentId: 99,
  };

  it("prefers Flywheel Energy Spur when that site is assigned", () => {
    expect(pickPreferredGateDefaultSite([older, spur], older)?.siteCode).toBe(
      FLYWHEEL_SPUR_SITE_CODE,
    );
  });

  it("uses the API default when Flywheel Spur is not assigned", () => {
    expect(pickPreferredGateDefaultSite([older], older)?.siteCode).toBe("SITE-OLD");
  });
});

describe("pickDefaultGateHostKey", () => {
  it("prefers the partner host as the current location host", () => {
    expect(
      pickDefaultGateHostKey([
        { key: "vendor:1054", type: "vendor" },
        { key: "partner:566", type: "partner" },
      ]),
    ).toBe("partner:566");
  });
});

describe("resolveAssignedGateSites", () => {
  const spurContext = {
    site: {
      id: 309,
      name: "Flywheel Energy Spur",
      address: "34.63951, -97.66194",
      siteCode: FLYWHEEL_SPUR_SITE_CODE,
      latitude: 34.63951,
      longitude: -97.66194,
    },
    vendors: [{ id: 1054 }],
  };

  it("falls back to Flywheel Spur when the assigned-sites API is missing", async () => {
    const result = await resolveAssignedGateSites({
      vendorId: 1054,
      listAssigned: async () => {
        throw new Error("HTTP 404");
      },
      getSiteContext: async () => spurContext,
    });
    expect(result.defaultSite?.siteCode).toBe(FLYWHEEL_SPUR_SITE_CODE);
    expect(result.defaultSite?.name).toBe("Flywheel Energy Spur");
  });
});
