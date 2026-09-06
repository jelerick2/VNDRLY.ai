import { getApiBase } from "@/lib/api";

export interface AskVRealtimeClient {
  connect(): Promise<void>;
  close(): void;
  interrupt(): void;
  setMicEnabled(enabled: boolean): void;
  updateContext(context: { path?: string; entityId?: number | null; org?: string | null; location?: string | null }): void;
}

type WebRTCModule = {
  RTCPeerConnection: new (config?: object) => {
    addTrack(track: unknown, stream: unknown): void;
    createDataChannel(name: string): {
      onmessage: ((event: { data: string }) => void) | null;
      send(data: string): void;
      close(): void;
      readyState: string;
    };
    createOffer(): Promise<{ sdp?: string }>;
    setLocalDescription(desc: unknown): Promise<void>;
    setRemoteDescription(desc: unknown): Promise<void>;
    close(): void;
    ontrack: ((event: { streams: Array<{ toURL?: () => string }> }) => void) | null;
  };
  mediaDevices: {
    getUserMedia(constraints: { audio: boolean; video: boolean }): Promise<{
      getTracks(): Array<{ stop(): void; enabled: boolean }>;
      getAudioTracks(): Array<{ enabled: boolean }>;
    }>;
  };
  MediaStream: new () => unknown;
};

function loadWebRTC(): WebRTCModule | null {
  try {
    return require("react-native-webrtc") as WebRTCModule;
  } catch {
    return null;
  }
}

export async function createAskVRealtimeClient(args: {
  token: string;
  seedMessage?: string;
  path?: string;
  onToolCall: (call: { name: string; arguments: unknown; callId: string }) => Promise<string>;
  onDone?: () => void;
  onSpeechStarted?: () => void;
  onSpeechStopped?: () => void;
  onAudio?: () => void;
  onError?: (message: string) => void;
}): Promise<AskVRealtimeClient> {
  const webrtc = loadWebRTC();
  if (!webrtc) {
    throw new Error("assistant.realtime_unavailable");
  }
  const stream = await webrtc.mediaDevices.getUserMedia({ audio: true, video: false });
  const pc = new webrtc.RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  });
  stream.getTracks().forEach((track) => pc.addTrack(track, stream));
  const channel = pc.createDataChannel("oai-events");
  channel.onmessage = (event) => {
    void (async () => {
      try {
        const payload = JSON.parse(String(event.data)) as Record<string, unknown>;
        if (payload.type === "input_audio_buffer.speech_started") args.onSpeechStarted?.();
        if (payload.type === "input_audio_buffer.speech_stopped") args.onSpeechStopped?.();
        if (payload.type === "response.output_audio.delta" || payload.type === "response.audio.delta") {
          args.onAudio?.();
        }
        if (payload.type === "response.done") args.onDone?.();
        if (payload.type === "response.function_call_arguments.done") {
          const output = await args.onToolCall({
            name: String(payload.name ?? ""),
            arguments: payload.arguments,
            callId: String(payload.call_id ?? ""),
          });
          if (channel.readyState === "open") {
            channel.send(JSON.stringify({
              type: "conversation.item.create",
              item: { type: "function_call_output", call_id: payload.call_id, output },
            }));
            channel.send(JSON.stringify({ type: "response.create" }));
          }
        }
      } catch (err) {
        args.onError?.(err instanceof Error ? err.message : "AskV voice error");
      }
    })();
  };

  return {
    async connect() {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      const params = new URLSearchParams({ seedMessage: args.seedMessage ?? "voice command" });
      if (args.path) params.set("path", args.path);
      const res = await fetch(`${getApiBase()}/api/assistant/realtime/call?${params.toString()}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/sdp",
          Authorization: `Bearer ${args.token}`,
        },
        body: offer.sdp ?? "",
      });
      if (!res.ok) throw new Error("assistant.realtime_sdp_failed");
      await pc.setRemoteDescription({ type: "answer", sdp: await res.text() });
    },
    interrupt() {
      if (channel.readyState === "open") channel.send(JSON.stringify({ type: "response.cancel" }));
    },
    setMicEnabled(enabled: boolean) {
      stream.getAudioTracks().forEach((track) => {
        track.enabled = enabled;
      });
    },
    updateContext(context) {
      if (channel.readyState !== "open") return;
      channel.send(JSON.stringify({
        type: "conversation.item.create",
        item: {
          type: "message",
          role: "user",
          content: [{ type: "input_text", text: `Context update: ${JSON.stringify(context)}` }],
        },
      }));
    },
    close() {
      stream.getTracks().forEach((track) => track.stop());
      if (channel.readyState !== "closed") channel.close();
      pc.close();
    },
  };
}
