import { describe, expect, it } from "vitest";
import { ASKV_NATURAL_VOICE_FLAG, isAskVNaturalVoiceEnabled } from "./askv-natural-voice";

describe("AskV natural voice flag", () => {
  it("defaults on and can be disabled per browser", () => {
    window.localStorage.removeItem(ASKV_NATURAL_VOICE_FLAG);
    expect(isAskVNaturalVoiceEnabled()).toBe(true);
    window.localStorage.setItem(ASKV_NATURAL_VOICE_FLAG, "0");
    expect(isAskVNaturalVoiceEnabled()).toBe(false);
    window.localStorage.setItem(ASKV_NATURAL_VOICE_FLAG, "1");
    expect(isAskVNaturalVoiceEnabled()).toBe(true);
  });
});
