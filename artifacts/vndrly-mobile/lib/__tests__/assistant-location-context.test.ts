import { describe, expect, it } from "vitest";

import {
  buildAskVLocationContext,
  shouldAttachAskVLocation,
} from "../assistant-location-context";

describe("shouldAttachAskVLocation", () => {
  it("attaches location for ticket and map routing questions", () => {
    expect(shouldAttachAskVLocation("How many miles to my next ticket?")).toBe(true);
    expect(shouldAttachAskVLocation("How long will it take to get to ticket #10959?")).toBe(true);
    expect(shouldAttachAskVLocation("What jobs are near me on the map?")).toBe(true);
  });

  it("does not attach location for unrelated AskV questions", () => {
    expect(shouldAttachAskVLocation("How many open invoices do we have?")).toBe(false);
    expect(shouldAttachAskVLocation("Summarize my notifications")).toBe(false);
  });
});

describe("buildAskVLocationContext", () => {
  it("normalizes expo-location coordinates for request-scoped AskV use", () => {
    expect(
      buildAskVLocationContext({
        coords: {
          latitude: 31.9972,
          longitude: -102.0779,
          accuracy: 14.7,
        },
        timestamp: 1_788_345_600_000,
      }),
    ).toEqual({
      latitude: 31.9972,
      longitude: -102.0779,
      accuracyMeters: 14.7,
      capturedAt: "2026-09-02T10:40:00.000Z",
      source: "mobile_device",
    });
  });
});
