import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import SphereBackButton from "./sphere-back-button";

describe("SphereBackButton", () => {
  it("uses the shared branded-circle hover motion", () => {
    render(
      <button type="button" className="group" aria-label="Back">
        <SphereBackButton />
      </button>,
    );

    const chrome = screen.getByTestId("sphere-back-circle");
    expect(chrome.className).toContain("group-hover:scale-[1.04]");
    expect(chrome.className).toContain("group-hover:-translate-y-0.5");
    expect(chrome.className).toContain("group-active:scale-[0.98]");
  });
});
