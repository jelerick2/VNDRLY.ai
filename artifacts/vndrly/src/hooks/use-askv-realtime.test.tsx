import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  connect: vi.fn(async () => undefined),
  close: vi.fn(),
  interrupt: vi.fn(),
  setMicEnabled: vi.fn(),
  updateContext: vi.fn(),
}));

vi.mock("@/lib/askv-realtime-client", () => ({
  createAskVRealtimeClient: vi.fn(async () => mocks),
}));

import { useAskVRealtime } from "./use-askv-realtime";

describe("useAskVRealtime", () => {
  beforeEach(() => {
    mocks.connect.mockClear();
    mocks.close.mockClear();
    mocks.interrupt.mockClear();
    mocks.setMicEnabled.mockClear();
    mocks.updateContext.mockClear();
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (String(url).includes("/greeting")) {
        return { ok: true, json: async () => ({ text: "I'm listening.", style: "short" }) };
      }
      return { ok: true, json: async () => ({ output: "ok" }) };
    }));
  });

  it("starts a multi-turn conversation from panel open and does not close on done", async () => {
    const { result } = renderHook(() => useAskVRealtime({ acrossVndrly: false }));
    await act(async () => {
      await result.current.startConversation("open AskV", "/askv");
    });
    expect(result.current.state).toBe("listening");
    expect(result.current.greeting).toBe("I'm listening.");
    expect(mocks.connect).toHaveBeenCalled();
    expect(mocks.close).not.toHaveBeenCalled();
  });

  it("mutes capture immediately and can publish route context", async () => {
    const { result } = renderHook(() => useAskVRealtime({ acrossVndrly: true }));
    await act(async () => {
      await result.current.startConversation("open AskV", "/askv");
    });
    act(() => {
      result.current.setMicEnabled(false);
      result.current.updateContext({ path: "/tickets/1", entityId: 1 });
    });
    expect(result.current.state).toBe("muted");
    expect(mocks.setMicEnabled).toHaveBeenCalledWith(false);
    expect(mocks.updateContext).toHaveBeenCalledWith({ path: "/tickets/1", entityId: 1 });
  });
});
