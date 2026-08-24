import { describe, expect, it } from "vitest";
import { pickTogglePillSrc } from "./pick-toggle-pill";

const flywheelPill = require("../../../attached_assets/pills/pill_flywheel_blue.png");

describe("Flywheel mobile brand pill", () => {
  it("uses the custom Flywheel pill regardless of the fallback brand color", () => {
    expect(pickTogglePillSrc("#ff0000", "Flywheel Energy")).toBe(flywheelPill);
  });
});
