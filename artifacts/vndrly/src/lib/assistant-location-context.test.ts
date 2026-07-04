import { describe, expect, it } from "vitest";

import {
  buildAskVLocationContext,
  shouldAttachAskVLocation,
} from "./assistant-location-context";

describe("web AskV location context", () => {
  it("requests browser location only for map and routing questions", () => {
    expect(shouldAttachAskVLocation("How many miles to ticket #10959?")).toBe(true);
    expect(shouldAttachAskVLocation("Show me the route to the next site")).toBe(true);
    expect(shouldAttachAskVLocation("What's my ETA?")).toBe(true);
    expect(shouldAttachAskVLocation("How many open invoices are overdue?")).toBe(false);
  });

  it("normalizes browser geolocation coordinates for one AskV request", () => {
    expect(
      buildAskVLocationContext({
        coords: {
          latitude: 32.004,
          longitude: -102.077,
          accuracy: 12.9,
        },
        timestamp: Date.parse("2026-07-04T18:00:00.000Z"),
      }),
    ).toEqual({
      latitude: 32.004,
      longitude: -102.077,
      accuracyMeters: 12.9,
      capturedAt: "2026-07-04T18:00:00.000Z",
      source: "web_browser",
    });
  });
});
