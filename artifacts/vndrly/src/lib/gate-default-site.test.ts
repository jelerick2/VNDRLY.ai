import { describe, expect, it, vi } from "vitest";

import {
  FLYWHEEL_SPUR_SITE_CODE,
  pickDefaultGateHostKey,
  resolveAssignedGateSites,
  shouldApplyDefaultGateSite,
} from "./gate-default-site";

describe("shouldApplyDefaultGateSite", () => {
  it("applies the assigned site when the gate is still empty", () => {
    expect(
      shouldApplyDefaultGateSite({
        confirmedCode: null,
        typedCode: "",
        defaultSiteCode: "SITE-B40D77D2",
      }),
    ).toBe(true);
  });

  it("does not overwrite a site the gatekeeper already confirmed", () => {
    expect(
      shouldApplyDefaultGateSite({
        confirmedCode: "SITE-OLD",
        typedCode: "",
        defaultSiteCode: "SITE-B40D77D2",
      }),
    ).toBe(false);
  });

  it("does not steal the field while the gatekeeper is typing a code", () => {
    expect(
      shouldApplyDefaultGateSite({
        confirmedCode: null,
        typedCode: "SITE-",
        defaultSiteCode: "SITE-B40D77D2",
      }),
    ).toBe(false);
  });

  it("does nothing when the vendor has no assigned site", () => {
    expect(
      shouldApplyDefaultGateSite({
        confirmedCode: null,
        typedCode: "",
        defaultSiteCode: null,
      }),
    ).toBe(false);
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

  it("falls back to the first host when no partner is present", () => {
    expect(pickDefaultGateHostKey([{ key: "vendor:1054", type: "vendor" }])).toBe(
      "vendor:1054",
    );
    expect(pickDefaultGateHostKey([])).toBe("");
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

  it("uses the assigned-sites API when it is available", async () => {
    const listed = {
      sites: [{ ...spurContext.site, assignmentId: 14819 }],
      defaultSite: { ...spurContext.site, assignmentId: 14819 },
    };
    const getSiteContext = vi.fn();
    const result = await resolveAssignedGateSites({
      vendorId: 1054,
      listAssigned: async () => listed,
      getSiteContext,
    });
    expect(result).toEqual(listed);
    expect(getSiteContext).not.toHaveBeenCalled();
  });

  it("does not guess a customer site when the assigned-sites API is unavailable", async () => {
    const result = await resolveAssignedGateSites({
      vendorId: 1054,
      listAssigned: async () => {
        throw new Error("HTTP 404");
      },
      getSiteContext: async () => spurContext,
    });
    expect(result).toEqual({ sites: [], defaultSite: null });
  });

  it("does not fall back to Flywheel Spur for a vendor that is not assigned there", async () => {
    const result = await resolveAssignedGateSites({
      vendorId: 2,
      listAssigned: async () => {
        throw new Error("HTTP 404");
      },
      getSiteContext: async () => spurContext,
    });
    expect(result).toEqual({ sites: [], defaultSite: null });
  });
});
