import { describe, expect, it } from "vitest";
import midconPill from "@assets/pills/pill_midcon_blue.png";
import midconSquare from "@assets/button-palette/900x229_midcon_blue_square-v2.png";
import { pickTogglePillSrc } from "@/lib/pick-toggle-pill";
import { brandImagePillSrc } from "@/components/png-pill-rollover";
import { pickLoginSquareActive } from "@/lib/login-button-palette";

describe("Midcon brand assets", () => {
  it("uses the Midcon pill for toggles and branded pill surfaces", () => {
    expect(pickTogglePillSrc("#ff0000", "Midcon Solutions")).toBe(midconPill);
    expect(brandImagePillSrc("#ff0000", "Midcon Solutions")).toBe(midconPill);
  });

  it("uses the Midcon square for square buttons", () => {
    expect(pickLoginSquareActive("#ff0000", "Midcon Solutions")).toBe(midconSquare);
  });
});
