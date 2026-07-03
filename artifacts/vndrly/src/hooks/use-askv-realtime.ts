import { useCallback, useRef, useState } from "react";
import { createAskVRealtimeClient, type AskVRealtimeClient } from "@/lib/askv-realtime-client";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export type AskVRealtimeState = "idle" | "connecting" | "listening" | "running" | "error";

export function useAskVRealtime() {
  const [state, setState] = useState<AskVRealtimeState>("idle");
  const [error, setError] = useState<string | null>(null);
  const clientRef = useRef<AskVRealtimeClient | null>(null);
  const stateRef = useRef<AskVRealtimeState>("idle");

  const setRealtimeState = useCallback((next: AskVRealtimeState) => {
    stateRef.current = next;
    setState(next);
  }, []);

  const stop = useCallback(() => {
    clientRef.current?.close();
    clientRef.current = null;
    setRealtimeState("idle");
  }, [setRealtimeState]);

  const startOneCommand = useCallback(async (seedMessage?: string) => {
    if (stateRef.current !== "idle") return;
    setRealtimeState("connecting");
    setError(null);
    try {
      const client = await createAskVRealtimeClient({
        seedMessage,
        onToolCall: async (call) => {
          setRealtimeState("running");
          const res = await fetch(`${BASE}/api/assistant/realtime/tool-call`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: call.name,
              arguments: call.arguments,
              clientSurface: "web",
            }),
          });
          const data = (await res.json()) as { output?: string; message?: string; error?: string };
          return data.output ?? data.message ?? data.error ?? "";
        },
        onDone: () => {
          clientRef.current?.close();
          clientRef.current = null;
          setRealtimeState("idle");
        },
        onError: (message) => {
          setError(message);
          clientRef.current?.close();
          clientRef.current = null;
          setRealtimeState("error");
        },
      });
      clientRef.current = client;
      await client.connect();
      setRealtimeState("listening");
    } catch (err) {
      clientRef.current?.close();
      clientRef.current = null;
      setError(err instanceof Error ? err.message : "assistant.realtime_failed");
      setRealtimeState("error");
    }
  }, [setRealtimeState]);

  return { state, error, startOneCommand, stop };
}
