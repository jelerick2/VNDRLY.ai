import { describe, expect, it, vi } from "vitest";

import {
  createGateAudioSession,
  type GateAudioRecorder,
  type GateAudioStream,
} from "./gate-audio-session";

class FakeRecorder implements GateAudioRecorder {
  mimeType = "audio/webm";
  state = "inactive";
  ondataavailable: GateAudioRecorder["ondataavailable"] = null;
  onerror: GateAudioRecorder["onerror"] = null;
  onstop: GateAudioRecorder["onstop"] = null;

  start = vi.fn(() => {
    this.state = "recording";
  });

  stop = vi.fn(() => {
    this.state = "inactive";
    this.ondataavailable?.({ data: new Blob(["voice"], { type: this.mimeType }) });
    this.onstop?.();
  });
}

describe("createGateAudioSession", () => {
  it("records until the second toggle, then releases the mic and returns the audio", async () => {
    const stopTrack = vi.fn();
    const stream: GateAudioStream = { getTracks: () => [{ stop: stopTrack }] };
    const recorder = new FakeRecorder();
    const onAudio = vi.fn();
    const listening = vi.fn();
    const session = createGateAudioSession({
      getStream: vi.fn(async () => stream),
      createRecorder: () => recorder,
      onAudio,
      onListeningChange: listening,
      onError: vi.fn(),
    });

    await session.toggle();
    expect(recorder.start).toHaveBeenCalledTimes(1);
    expect(recorder.stop).not.toHaveBeenCalled();
    expect(session.isListening()).toBe(true);
    expect(listening).toHaveBeenLastCalledWith(true);

    await session.toggle();
    expect(recorder.stop).toHaveBeenCalledTimes(1);
    expect(stopTrack).toHaveBeenCalledTimes(1);
    expect(listening).toHaveBeenLastCalledWith(false);
    expect(onAudio).toHaveBeenCalledTimes(1);
    expect(onAudio.mock.calls[0][0]).toBeInstanceOf(Blob);
  });

  it("stops a stream acquired after the user toggles off during the permission prompt", async () => {
    const stopTrack = vi.fn();
    let resolveStream: ((stream: GateAudioStream) => void) | undefined;
    const getStream = vi.fn(() => new Promise<GateAudioStream>((resolve) => {
      resolveStream = resolve;
    }));
    const recorder = new FakeRecorder();
    const session = createGateAudioSession({
      getStream,
      createRecorder: () => recorder,
      onAudio: vi.fn(),
      onListeningChange: vi.fn(),
      onError: vi.fn(),
    });

    const starting = session.toggle();
    const stopping = session.toggle();
    resolveStream?.({ getTracks: () => [{ stop: stopTrack }] });
    await Promise.all([starting, stopping]);

    expect(recorder.start).not.toHaveBeenCalled();
    expect(recorder.stop).not.toHaveBeenCalled();
    expect(stopTrack).toHaveBeenCalledTimes(1);
    expect(session.isListening()).toBe(false);
  });
});
