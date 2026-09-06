import { useCallback, useRef, useState } from "react";
import { applyAskVClientIntent, parseAskVClientIntent } from "@/lib/askv-client-intents";
import { createAskVRealtimeClient, type AskVRealtimeClient } from "@/lib/askv-realtime-client";
import {
  ASKV_IDLE_MS,
  nextAskVVoiceState,
  type AskVVoiceEvent,
  type AskVVoiceState,
} from "@/lib/askv-voice-state";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export type AskVRealtimeState = AskVVoiceState;

export function useAskVRealtime(args?: { acrossVndrly?: boolean }) {
  const [state, setState] = useState<AskVVoiceState>("stopped");
  const [error, setError] = useState<string | null>(null);
  const [greeting, setGreeting] = useState<string | null>(null);
  const clientRef = useRef<AskVRealtimeClient | null>(null);
  const stateRef = useRef<AskVVoiceState>("stopped");
  const idleTimerRef = useRef<number | null>(null);
  const acrossRef = useRef(Boolean(args?.acrossVndrly));
  acrossRef.current = Boolean(args?.acrossVndrly);

  const apply = useCallback((event: AskVVoiceEvent) => {
    const next = nextAskVVoiceState(stateRef.current, event, acrossRef.current);
    stateRef.current = next;
    setState(next);
    return next;
  }, []);

  const clearIdle = useCallback(() => {
    if (idleTimerRef.current != null) {
      window.clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  }, []);

  const armIdle = useCallback(() => {
    clearIdle();
    idleTimerRef.current = window.setTimeout(() => {
      const next = apply("idleTimeout");
      if (next === "stopped" || next === "wake-idle") {
        clientRef.current?.close();
        clientRef.current = null;
      }
    }, ASKV_IDLE_MS);
  }, [apply, clearIdle]);

  const stop = useCallback(() => {
    clearIdle();
    clientRef.current?.close();
    clientRef.current = null;
    apply("stop");
  }, [apply, clearIdle]);

  const startConversation = useCallback(async (seedMessage?: string, path?: string) => {
    if (stateRef.current !== "stopped" && stateRef.current !== "muted" && stateRef.current !== "error" && stateRef.current !== "wake-idle") {
      return;
    }
    apply(stateRef.current === "wake-idle" ? "wake" : "open");
    setError(null);
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const greetRes = await fetch(`${BASE}/api/assistant/voice/greeting`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timeZone: tz }),
      });
      const greetData = greetRes.ok ? await greetRes.json() as { text?: string } : null;
      setGreeting(greetData?.text ?? "I'm listening.");

      const client = await createAskVRealtimeClient({
        seedMessage,
        path,
        onToolCall: async (call) => {
          apply("vadEnd");
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
          const data = (await res.json()) as {
            output?: string;
            message?: string;
            error?: string;
            intent?: unknown;
          };
          const output = data.output ?? data.message ?? data.error ?? "";
          const intent = parseAskVClientIntent(output);
          if (intent) applyAskVClientIntent(intent);
          return output;
        },
        onSpeechStarted: () => {
          if (stateRef.current === "speaking") {
            clientRef.current?.interrupt();
            apply("bargeIn");
          }
          apply("vadEnd");
          clearIdle();
        },
        onSpeechStopped: () => apply("vadEnd"),
        onAudio: () => apply("modelAudio"),
        onDone: () => {
          apply("responseDone");
          armIdle();
        },
        onError: (message) => {
          setError(message);
          clientRef.current?.close();
          clientRef.current = null;
          apply("fail");
        },
      });
      clientRef.current = client;
      await client.connect();
      apply("sessionReady");
      apply("greetingDone");
      armIdle();
    } catch (err) {
      clientRef.current?.close();
      clientRef.current = null;
      setError(err instanceof Error ? err.message : "assistant.realtime_failed");
      apply("fail");
    }
  }, [apply, armIdle, clearIdle]);

  const startOneCommand = startConversation;

  const interrupt = useCallback(() => {
    clientRef.current?.interrupt();
    apply("bargeIn");
  }, [apply]);

  const setMicEnabled = useCallback((enabled: boolean) => {
    clientRef.current?.setMicEnabled(enabled);
    apply(enabled ? "unmute" : "mute");
  }, [apply]);

  const updateContext = useCallback((
    context: { path?: string; entityId?: number | null; org?: string | null; location?: string | null },
  ) => {
    clientRef.current?.updateContext(context);
  }, []);

  return {
    state,
    error,
    greeting,
    startConversation,
    startOneCommand,
    stop,
    interrupt,
    setMicEnabled,
    updateContext,
  };
}
