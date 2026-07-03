import { describe, expect, it, beforeEach, vi } from "vitest";
import { askvTextOnlyKey, readAskVTextOnly, writeAskVTextOnly } from "./askv-voice-preferences";

describe("AskV web voice preferences", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("persists remembered text-only mode per user", () => {
    expect(readAskVTextOnly(11)).toBe(false);
    writeAskVTextOnly(11, true);
    expect(window.localStorage.getItem(askvTextOnlyKey(11))).toBe("1");
    expect(readAskVTextOnly(11)).toBe(true);
    expect(readAskVTextOnly(12)).toBe(false);
  });

  it("emits a change event when toggled", () => {
    const listener = vi.fn();
    window.addEventListener("askv:text-only-changed", listener);
    writeAskVTextOnly(11, true);
    expect(listener).toHaveBeenCalledTimes(1);
    window.removeEventListener("askv:text-only-changed", listener);
  });
});
