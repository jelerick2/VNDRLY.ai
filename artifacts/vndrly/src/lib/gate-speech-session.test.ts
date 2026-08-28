import { describe, expect, it, vi } from "vitest";

import {
  createGateSpeechSession,
  type GateSpeechRecognition,
} from "./gate-speech-session";

class FakeRecognition implements GateSpeechRecognition {
  continuous = false;
  interimResults = true;
  lang = "";
  start = vi.fn();
  stop = vi.fn();
  onresult: GateSpeechRecognition["onresult"] = null;
  onerror: GateSpeechRecognition["onerror"] = null;
  onend: GateSpeechRecognition["onend"] = null;
}

describe("createGateSpeechSession", () => {
  it("keeps recognition active across browser end events until the user toggles it off", () => {
    const recognitions: FakeRecognition[] = [];
    let restart: (() => void) | undefined;
    const listening = vi.fn();
    const session = createGateSpeechSession({
      createRecognition: () => {
        const recognition = new FakeRecognition();
        recognitions.push(recognition);
        return recognition;
      },
      onTranscript: vi.fn(),
      onListeningChange: listening,
      onError: vi.fn(),
      scheduleRestart: (callback) => {
        restart = callback;
        return 1;
      },
      cancelRestart: vi.fn(),
    });

    session.toggle();
    expect(recognitions).toHaveLength(1);
    expect(recognitions[0].continuous).toBe(true);
    expect(recognitions[0].start).toHaveBeenCalledTimes(1);
    expect(listening).toHaveBeenLastCalledWith(true);

    recognitions[0].onend?.();
    expect(restart).toBeTypeOf("function");
    restart?.();
    expect(recognitions).toHaveLength(2);
    expect(recognitions[1].start).toHaveBeenCalledTimes(1);

    session.toggle();
    expect(recognitions[1].stop).toHaveBeenCalledTimes(1);
    expect(listening).toHaveBeenLastCalledWith(false);
    restart = undefined;
    recognitions[1].onend?.();
    expect(restart).toBeUndefined();
  });

  it("emits only the new final transcript from a result event", () => {
    const recognition = new FakeRecognition();
    const onTranscript = vi.fn();
    const session = createGateSpeechSession({
      createRecognition: () => recognition,
      onTranscript,
      onListeningChange: vi.fn(),
      onError: vi.fn(),
    });

    session.toggle();
    recognition.onresult?.({
      resultIndex: 1,
      results: {
        0: { 0: { transcript: "old words" }, isFinal: true },
        1: { 0: { transcript: "Bob Villa checking out" }, isFinal: true },
        length: 2,
      },
    });

    expect(onTranscript).toHaveBeenCalledWith("Bob Villa checking out");
  });

  it("ignores no-speech errors but stops cleanly on microphone permission errors", () => {
    const recognition = new FakeRecognition();
    const listening = vi.fn();
    const onError = vi.fn();
    const session = createGateSpeechSession({
      createRecognition: () => recognition,
      onTranscript: vi.fn(),
      onListeningChange: listening,
      onError,
    });

    session.toggle();
    recognition.onerror?.({ error: "no-speech" });
    expect(onError).not.toHaveBeenCalled();
    expect(session.isListening()).toBe(true);

    recognition.onerror?.({ error: "not-allowed" });
    expect(onError).toHaveBeenCalledWith("not-allowed");
    expect(session.isListening()).toBe(false);
    expect(listening).toHaveBeenLastCalledWith(false);
  });
});
