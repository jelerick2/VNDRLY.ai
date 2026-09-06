import { describe, expect, it } from "vitest";
import { isAskVNaturalVoiceEnabled } from "../askv-natural-voice";

describe("mobile AskV natural voice flag", () => {
  it("defaults on so Gate Voice is AskV", () => {
    expect(isAskVNaturalVoiceEnabled()).toBe(true);
  });
});
