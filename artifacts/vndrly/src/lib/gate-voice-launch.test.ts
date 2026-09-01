import { beforeEach, describe, expect, it } from "vitest";

import {
  consumePendingGateVoiceEntry,
  queueGateVoiceEntry,
} from "./gate-voice-launch";

describe("gate voice navigation handoff", () => {
  beforeEach(() => {
    consumePendingGateVoiceEntry();
  });

  it("queues one voice launch for SPA navigation without persistent storage", () => {
    queueGateVoiceEntry();

    expect(consumePendingGateVoiceEntry()).toBe(true);
    expect(consumePendingGateVoiceEntry()).toBe(false);
    expect(sessionStorage.getItem("vndrly:gate-voice-pending")).toBeNull();
  });
});
