import { describe, expect, it } from "vitest";
import { nextAskVVoiceState } from "../askv-voice-state";

describe("AskV mobile voice state machine", () => {
  it("opens, greets, listens, and supports barge-in", () => {
    let state = nextAskVVoiceState("stopped", "open");
    state = nextAskVVoiceState(state, "sessionReady");
    state = nextAskVVoiceState(state, "greetingDone");
    expect(state).toBe("listening");
    expect(nextAskVVoiceState("speaking", "bargeIn")).toBe("interrupted");
    expect(nextAskVVoiceState("listening", "idleTimeout", true)).toBe("wake-idle");
  });
});
