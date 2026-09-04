import React from "react";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import GateVoiceNavButton, { VOICE_NAV_ICON_SIZE } from "./GateVoiceNavButton";

vi.mock("@/hooks/useColors", () => ({
  useColors: () => ({ primary: "#FFB800", mutedForeground: "#a3a3a3" }),
}));

afterEach(cleanup);

describe("GateVoiceNavButton", () => {
  it("renders the exact two-layer brand composite at 112.5% icon size", () => {
    const { getByTestId } = render(
      <GateVoiceNavButton active label="Voice" onPress={() => undefined} />,
    );
    const back = getByTestId("gate-voice-nav-back");
    const overlay = getByTestId("gate-voice-nav-overlay");
    expect(VOICE_NAV_ICON_SIZE).toBe(29.25);
    expect(back.querySelector("img")?.getAttribute("src")).toContain(
      "white-circle-voice-back.png",
    );
    expect(overlay.querySelector("img")?.getAttribute("src")).toContain(
      "white-circle-voice-overlay.png",
    );
    expect(back.innerHTML).toContain("#FFB800");
    expect(overlay.innerHTML).not.toContain("#FFB800");
  });

  it("exposes listening state and forwards presses", () => {
    const onPress = vi.fn();
    const { getByTestId } = render(
      <GateVoiceNavButton active label="Voice" onPress={onPress} />,
    );
    const button = getByTestId("gate-voice-nav");
    expect(button.getAttribute("aria-checked")).toBe("true");
    expect(button.getAttribute("aria-valuetext")).toBe("Listening");
    fireEvent.click(button);
    expect(onPress).toHaveBeenCalledOnce();
  });
});
