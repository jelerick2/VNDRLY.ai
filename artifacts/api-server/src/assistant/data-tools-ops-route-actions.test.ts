import { describe, expect, it } from "vitest";

import { buildRouteActionLinks } from "./data-tools-ops";

describe("buildRouteActionLinks", () => {
  it("builds ticket, map, and navigation actions for route answers", () => {
    expect(
      buildRouteActionLinks({
        ticketId: 42,
        siteId: 9,
        siteLatitude: 32.1,
        siteLongitude: -102.2,
      }),
    ).toEqual([
      { label: "Open ticket #42", url: "/tickets/42" },
      { label: "Open map", url: "/site-map?siteId=9" },
      {
        label: "Start navigation",
        url: "https://www.google.com/maps/dir/?api=1&destination=32.1%2C-102.2",
      },
    ]);
  });

  it("falls back to the crew map when no site id is present", () => {
    expect(buildRouteActionLinks({ ticketId: null })).toEqual([
      { label: "Open map", url: "/crew-map" },
    ]);
  });
});
