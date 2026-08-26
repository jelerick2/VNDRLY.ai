import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  requestGateVoiceEntry,
  setGateVoiceListening,
  subscribeGateVoiceEntry,
  subscribeGateVoiceListening,
} from "./gate-voice-launch";

beforeEach(() => {
  setGateVoiceListening(false);
});

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

  it("publishes the current listening state to the microphone tab", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeGateVoiceListening(listener);
    expect(listener).toHaveBeenCalledWith(false);

    setGateVoiceListening(true);
    expect(listener).toHaveBeenLastCalledWith(true);
    unsubscribe();
  });
});
