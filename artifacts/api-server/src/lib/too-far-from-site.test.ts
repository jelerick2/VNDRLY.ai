import { describe, expect, it } from "vitest";
import {
  formatMetersAsMiles,
  formatTooFarFromSiteMessage,
} from "@workspace/map-utils";

describe("formatMetersAsMiles", () => {
  it("uses one decimal when the distance is not a whole mile", () => {
    expect(formatMetersAsMiles(106800)).toBe("66.4");
  });

  it("drops the decimal for a whole mile (1609 m ≈ 1 mile)", () => {
    expect(formatMetersAsMiles(1609)).toBe("1");
  });
});

describe("formatTooFarFromSiteMessage", () => {
  it("renders the Gate screenshot distances in miles with singular 1 mile", () => {
    expect(formatTooFarFromSiteMessage(106800, 1609)).toBe(
      "You are too far from the site (66.4 miles away, must be within 1 mile).",
    );
  });

  it("pluralizes miles when the radius is not 1", () => {
    expect(formatTooFarFromSiteMessage(320, 150)).toBe(
      "You are too far from the site (0.2 miles away, must be within 0.1 miles).",
    );
  });
});
