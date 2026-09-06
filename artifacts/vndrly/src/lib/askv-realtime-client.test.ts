import { beforeEach, describe, expect, it, vi } from "vitest";
import { createAskVRealtimeClient } from "./askv-realtime-client";

class FakeChannel {
  readyState = "open";
  onmessage: ((event: { data: string }) => void) | null = null;
  sent: string[] = [];
  send(data: string) {
    this.sent.push(data);
  }
  close() {
    this.readyState = "closed";
  }
}

class FakePeer {
  ontrack: ((event: { streams: MediaStream[] }) => void) | null = null;
  channel = new FakeChannel();
  addTrack = vi.fn();
  createDataChannel = vi.fn(() => this.channel);
  createOffer = vi.fn(async () => ({ sdp: "offer-sdp" }));
  setLocalDescription = vi.fn(async () => undefined);
  setRemoteDescription = vi.fn(async () => undefined);
  close = vi.fn();
}

describe("AskV realtime client", () => {
  const peer = new FakePeer();

  beforeEach(() => {
    peer.channel = new FakeChannel();
    class FakeRTCPeerConnection {
      constructor() {
        return peer;
      }
    }
    vi.stubGlobal("RTCPeerConnection", FakeRTCPeerConnection);
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      text: async () => "answer-sdp",
    })));
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: vi.fn(async () => ({
          getTracks: () => [{ stop: vi.fn(), enabled: true }],
          getAudioTracks: () => [{ enabled: true }],
        })),
      },
    });
  });

  it("connects, barges in, and keeps the peer connection open after done", async () => {
    const onDone = vi.fn();
    const onSpeechStarted = vi.fn();
    const client = await createAskVRealtimeClient({
      seedMessage: "open AskV",
      path: "/askv",
      onToolCall: async () => "",
      onDone,
      onSpeechStarted,
    });
    await client.connect();
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/assistant/realtime/call?"),
      expect.objectContaining({ method: "POST" }),
    );
    peer.channel.onmessage?.({ data: JSON.stringify({ type: "input_audio_buffer.speech_started" }) });
    peer.channel.onmessage?.({ data: JSON.stringify({ type: "response.done" }) });
    expect(onSpeechStarted).toHaveBeenCalled();
    expect(onDone).toHaveBeenCalled();
    client.interrupt();
    expect(peer.channel.sent).toContain(JSON.stringify({ type: "response.cancel" }));
    client.updateContext({ path: "/gatekeeper", org: "vendor:22" });
    expect(peer.channel.sent.some((item) => item.includes("Context update"))).toBe(true);
    expect(peer.close).not.toHaveBeenCalled();
  });
});
