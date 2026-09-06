const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export interface AskVRealtimeToolCall {
  name: string;
  arguments: unknown;
  callId: string;
}

export interface AskVRealtimeClient {
  connect(): Promise<void>;
  close(): void;
  interrupt(): void;
  setMicEnabled(enabled: boolean): void;
  updateContext(context: { path?: string; entityId?: number | null; org?: string | null; location?: string | null }): void;
}

function parseEvent(data: string): Record<string, unknown> | null {
  try {
    return JSON.parse(data) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function parseArguments(value: unknown): unknown {
  if (typeof value !== "string") return value ?? {};
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

function maybeFunctionCall(payload: Record<string, unknown>): AskVRealtimeToolCall | null {
  if (payload.type === "response.function_call_arguments.done") {
    const name = typeof payload.name === "string" ? payload.name : "";
    const callId = typeof payload.call_id === "string" ? payload.call_id : "";
    if (!name || !callId) return null;
    return {
      name,
      callId,
      arguments: parseArguments(payload.arguments),
    };
  }

  if (payload.type === "response.output_item.done") {
    const item = payload.item as Record<string, unknown> | undefined;
    if (item?.type !== "function_call") return null;
    const name = typeof item.name === "string" ? item.name : "";
    const callId = typeof item.call_id === "string" ? item.call_id : "";
    if (!name || !callId) return null;
    return {
      name,
      callId,
      arguments: parseArguments(item.arguments),
    };
  }

  return null;
}

export async function createAskVRealtimeClient(args: {
  seedMessage?: string;
  path?: string;
  entityId?: number | null;
  onToolCall: (call: AskVRealtimeToolCall) => Promise<string>;
  onDone?: () => void;
  onSpeechStarted?: () => void;
  onSpeechStopped?: () => void;
  onAudio?: () => void;
  onError?: (message: string) => void;
}): Promise<AskVRealtimeClient> {
  const pc = new RTCPeerConnection();
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
  stream.getTracks().forEach((track) => pc.addTrack(track, stream));

  const audio = document.createElement("audio");
  audio.autoplay = true;
  pc.ontrack = (event) => {
    const [remoteStream] = event.streams;
    if (remoteStream) audio.srcObject = remoteStream;
  };

  const channel = pc.createDataChannel("oai-events");
  channel.onmessage = (event) => {
    void (async () => {
      const payload = parseEvent(String(event.data));
      if (!payload) return;
      if (payload.type === "input_audio_buffer.speech_started") args.onSpeechStarted?.();
      if (payload.type === "input_audio_buffer.speech_stopped") args.onSpeechStopped?.();
      if (payload.type === "response.output_audio.delta" || payload.type === "response.audio.delta") {
        args.onAudio?.();
      }
      if (payload.type === "response.done") args.onDone?.();
      if (payload.type === "error") {
        const error = payload.error as { message?: string } | undefined;
        args.onError?.(error?.message ?? "AskV voice error");
      }
      const call = maybeFunctionCall(payload);
      if (!call) return;
      const output = await args.onToolCall(call);
      channel.send(JSON.stringify({
        type: "conversation.item.create",
        item: {
          type: "function_call_output",
          call_id: call.callId,
          output,
        },
      }));
      channel.send(JSON.stringify({ type: "response.create" }));
    })();
  };

  return {
    async connect() {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      const params = new URLSearchParams({ seedMessage: args.seedMessage ?? "voice command" });
      if (args.path) params.set("path", args.path);
      if (args.entityId != null) params.set("entityId", String(args.entityId));
      const sdpRes = await fetch(`${BASE}/api/assistant/realtime/call?${params.toString()}`, {
        method: "POST",
        body: offer.sdp ?? "",
        credentials: "include",
        headers: {
          "Content-Type": "application/sdp",
        },
      });
      if (!sdpRes.ok) throw new Error("assistant.realtime_sdp_failed");
      await pc.setRemoteDescription({ type: "answer", sdp: await sdpRes.text() });
    },
    interrupt() {
      audio.pause();
      if (channel.readyState === "open") {
        channel.send(JSON.stringify({ type: "response.cancel" }));
      }
    },
    setMicEnabled(enabled: boolean) {
      stream.getAudioTracks().forEach((track) => {
        track.enabled = enabled;
      });
      if (!enabled) {
        audio.pause();
        audio.muted = true;
      } else {
        audio.muted = false;
        void audio.play().catch(() => undefined);
      }
    },
    updateContext(context) {
      if (channel.readyState !== "open") return;
      channel.send(JSON.stringify({
        type: "conversation.item.create",
        item: {
          type: "message",
          role: "user",
          content: [{
            type: "input_text",
            text: `Context update: ${JSON.stringify(context)}`,
          }],
        },
      }));
    },
    close() {
      stream.getTracks().forEach((track) => track.stop());
      if (channel.readyState !== "closed") channel.close();
      pc.close();
      audio.srcObject = null;
    },
  };
}
