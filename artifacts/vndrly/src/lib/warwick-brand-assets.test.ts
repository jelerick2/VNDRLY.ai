import { describe, expect, it } from "vitest";
import { pillPurple } from "@/lib/pill-palette-assets";
import { pickTogglePillSrc } from "@/lib/pick-toggle-pill";

describe("Warwick brand assets", () => {
  it("uses the purple pill for Warwick's primary brand color", () => {
    expect(pickTogglePillSrc("#441e5b", "Warwick Energy Group")).toBe(
      pillPurple,
    );
  });
});
