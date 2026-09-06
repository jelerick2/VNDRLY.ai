import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  user: { userId: 11, vendorId: 22 } as { userId: number; vendorId: number } | null,
  startConversation: vi.fn(async () => undefined),
  stop: vi.fn(),
  setMicEnabled: vi.fn(),
  updateContext: vi.fn(),
  state: "stopped" as string,
}));

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: mocks.user }),
}));

vi.mock("wouter", () => ({
  useLocation: () => ["/askv", vi.fn()],
}));

vi.mock("@/hooks/use-askv-realtime", () => ({
  useAskVRealtime: () => ({
    state: mocks.state,
    error: null,
    greeting: "I'm listening.",
    startConversation: mocks.startConversation,
    stop: mocks.stop,
    setMicEnabled: mocks.setMicEnabled,
    updateContext: mocks.updateContext,
  }),
}));

vi.mock("@/hooks/use-askv-wake-listener", () => ({
  useAskVWakeListener: () => undefined,
}));

import { AskVVoiceProvider, useAskVVoiceSession } from "./use-askv-voice-session";
import { writeAskVMuted } from "@/lib/askv-voice-preferences";

function wrapper({ children }: { children: ReactNode }) {
  return <AskVVoiceProvider>{children}</AskVVoiceProvider>;
}

describe("AskVVoiceProvider", () => {
  beforeEach(() => {
    window.localStorage.clear();
    mocks.user = { userId: 11, vendorId: 22 };
    mocks.startConversation.mockClear();
    mocks.stop.mockClear();
    mocks.setMicEnabled.mockClear();
  });

  it("persists mute per user and browser without disabling typed AskV", () => {
    const { result } = renderHook(() => useAskVVoiceSession(), { wrapper });
    act(() => {
      result.current.setMuted(true);
    });
    expect(result.current.muted).toBe(true);
    expect(window.localStorage.getItem("askv:muted:11")).toBe("1");
    expect(mocks.stop).toHaveBeenCalled();
    writeAskVMuted(11, false);
  });
});
