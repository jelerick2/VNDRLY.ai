import { describe, expect, it } from "vitest";
import flywheelPill from "@assets/pills/pill_flywheel_blue.png";
import flywheelSquare from "@assets/button-palette/900x229_flywheel_blue_square-v2.png";
import { pickTogglePillSrc } from "@/lib/pick-toggle-pill";
import { brandImagePillSrc } from "@/components/png-pill-rollover";
import { pickLoginSquareActive } from "@/lib/login-button-palette";

describe("Flywheel brand assets", () => {
  it("uses the Flywheel pill for toggles and branded pill surfaces", () => {
    expect(pickTogglePillSrc("#ff0000", "Flywheel Energy")).toBe(flywheelPill);
    expect(brandImagePillSrc("#ff0000", "Flywheel Energy")).toBe(flywheelPill);
  });

  it("uses the Flywheel square for square buttons", () => {
    expect(pickLoginSquareActive("#ff0000", "Flywheel Energy")).toBe(flywheelSquare);
  });
});
