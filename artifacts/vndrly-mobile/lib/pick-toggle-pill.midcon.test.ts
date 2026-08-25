import { describe, expect, it } from "vitest";
import { pickTogglePillSrc } from "./pick-toggle-pill";

const midconPill = require("@/assets/pills/pill_midcon_blue.png");

describe("Midcon mobile brand pill", () => {
  it("uses the custom Midcon pill regardless of the fallback brand color", () => {
    expect(pickTogglePillSrc("#ff0000", "Midcon Solutions")).toBe(midconPill);
  });
});
