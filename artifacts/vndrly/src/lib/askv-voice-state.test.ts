import { describe, expect, it } from "vitest";
import { nextAskVVoiceState } from "./askv-voice-state";

describe("AskV voice state machine", () => {
  it("opens into a greeted listening loop and returns after speaking", () => {
    let state = nextAskVVoiceState("stopped", "open");
    state = nextAskVVoiceState(state, "sessionReady");
    state = nextAskVVoiceState(state, "greetingDone");
    expect(state).toBe("listening");
    state = nextAskVVoiceState(state, "vadEnd");
    state = nextAskVVoiceState(state, "modelAudio");
    expect(state).toBe("speaking");
    expect(nextAskVVoiceState(state, "bargeIn")).toBe("interrupted");
    expect(nextAskVVoiceState(state, "responseDone")).toBe("listening");
  });

  it("idles to stopped unless AskV across VNDRLY is on", () => {
    expect(nextAskVVoiceState("listening", "idleTimeout", false)).toBe("stopped");
    expect(nextAskVVoiceState("listening", "idleTimeout", true)).toBe("wake-idle");
    expect(nextAskVVoiceState("wake-idle", "wake")).toBe("connecting");
  });

  it("mutes from an active conversation and can resume", () => {
    expect(nextAskVVoiceState("speaking", "mute")).toBe("muted");
    expect(nextAskVVoiceState("muted", "unmute")).toBe("connecting");
  });
});
