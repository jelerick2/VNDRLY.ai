import { describe, expect, it, vi } from "vitest";

import { requestGateVoiceEntry, subscribeGateVoiceEntry } from "./gate-voice-launch";

describe("gate voice launch", () => {
  it("delivers a request made before the Gate screen subscribes", () => {
    requestGateVoiceEntry();
    const listener = vi.fn();
    const unsubscribe = subscribeGateVoiceEntry(listener);
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it("delivers a request immediately when the Gate screen is already mounted", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeGateVoiceEntry(listener);
    requestGateVoiceEntry();
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });
});
