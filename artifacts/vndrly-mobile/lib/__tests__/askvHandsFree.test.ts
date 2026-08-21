import { describe, expect, it } from "vitest";

import {
  nextAskVHandsFreeAction,
  nextAskVHandsFreePhaseAfterReply,
  nextAskVHandsFreePhaseAfterSpeech,
  type AskVHandsFreeRuntime,
} from "../askvHandsFree";

function runtime(overrides: Partial<AskVHandsFreeRuntime> = {}): AskVHandsFreeRuntime {
  return {
    enabled: true,
    phase: "armed",
    streaming: false,
    transcribing: false,
    speaking: false,
    voiceRecording: false,
    readAloud: true,
    ...overrides,
  };
}

describe("AskV hands-free state machine", () => {
  it("starts listening only when armed and AskV is idle", () => {
    expect(nextAskVHandsFreeAction(runtime())).toBe("start-listening");
  });

  it("waits while AskV is streaming, transcribing, speaking, or already recording", () => {
    expect(nextAskVHandsFreeAction(runtime({ streaming: true }))).toBe("wait");
    expect(nextAskVHandsFreeAction(runtime({ transcribing: true }))).toBe("wait");
    expect(nextAskVHandsFreeAction(runtime({ speaking: true }))).toBe("wait");
    expect(nextAskVHandsFreeAction(runtime({ voiceRecording: true }))).toBe("wait");
  });

  it("turns itself off when read-aloud is disabled", () => {
    expect(nextAskVHandsFreeAction(runtime({ readAloud: false }))).toBe("turn-off");
  });

  it("re-arms after a spoken reply when hands-free remains enabled", () => {
    expect(nextAskVHandsFreePhaseAfterReply("thinking", true)).toBe("speaking");
    expect(nextAskVHandsFreePhaseAfterSpeech("speaking", true)).toBe("armed");
  });

  it("stays off when hands-free was disabled mid-turn", () => {
    expect(nextAskVHandsFreePhaseAfterReply("off", true)).toBe("off");
    expect(nextAskVHandsFreePhaseAfterSpeech("speaking", false)).toBe("off");
  });
});
