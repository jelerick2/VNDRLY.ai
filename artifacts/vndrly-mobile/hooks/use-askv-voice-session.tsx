import { usePathname } from "expo-router";
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { getToken, getUser } from "@/lib/auth";
import { createAskVRealtimeClient, type AskVRealtimeClient } from "@/lib/askv-realtime-client";
import { configureAskVAudioSession, releaseAskVAudioSession, subscribeAskVAppState } from "@/lib/askv-audio-session";
import { getApiBase } from "@/lib/api";
import {
  ASKV_IDLE_MS,
  nextAskVVoiceState,
  type AskVVoiceEvent,
  type AskVVoiceState,
} from "@/lib/askv-voice-state";
import { readAskVAcrossVndrly, readAskVMuted, writeAskVMuted } from "@/lib/askvVoicePreferences";

interface AskVVoiceSessionValue {
  state: AskVVoiceState;
  error: string | null;
  greeting: string | null;
  muted: boolean;
  acrossVndrly: boolean;
  wakeSupported: boolean;
  startConversation: (seed?: string, path?: string) => Promise<void>;
  stop: () => void;
  setMuted: (muted: boolean) => void;
}

const AskVVoiceSessionContext = createContext<AskVVoiceSessionValue | null>(null);

export function AskVVoiceProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [state, setState] = useState<AskVVoiceState>("stopped");
  const [error, setError] = useState<string | null>(null);
  const [greeting, setGreeting] = useState<string | null>(null);
  const [muted, setMutedState] = useState(false);
  const [acrossVndrly, setAcross] = useState(false);
  const clientRef = useRef<AskVRealtimeClient | null>(null);
  const stateRef = useRef<AskVVoiceState>("stopped");
  const idleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const acrossRef = useRef(false);

  const apply = (event: AskVVoiceEvent) => {
    const next = nextAskVVoiceState(stateRef.current, event, acrossRef.current);
    stateRef.current = next;
    setState(next);
    return next;
  };

  const stop = () => {
    if (idleRef.current) clearTimeout(idleRef.current);
    clientRef.current?.close();
    clientRef.current = null;
    void releaseAskVAudioSession();
    apply("stop");
  };

  const startConversation = async (seed?: string, path?: string) => {
    const user = await getUser();
    if (!user || muted) return;
    apply("open");
    try {
      await configureAskVAudioSession();
      const token = await getToken();
      if (!token) throw new Error("auth.not_authenticated");
      const greetRes = await fetch(`${getApiBase()}/api/assistant/voice/greeting`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }),
      });
      if (greetRes.ok) {
        const data = (await greetRes.json()) as { text?: string };
        setGreeting(data.text ?? "I'm listening.");
      }
      const client = await createAskVRealtimeClient({
        token,
        seedMessage: seed,
        path,
        onToolCall: async (call) => {
          apply("vadEnd");
          const res = await fetch(`${getApiBase()}/api/assistant/realtime/tool-call`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              name: call.name,
              arguments: call.arguments,
              clientSurface: "ios",
            }),
          });
          const data = (await res.json()) as { output?: string; message?: string; error?: string };
          return data.output ?? data.message ?? data.error ?? "";
        },
        onSpeechStarted: () => {
          if (stateRef.current === "speaking") {
            clientRef.current?.interrupt();
            apply("bargeIn");
          }
          apply("vadEnd");
        },
        onAudio: () => apply("modelAudio"),
        onDone: () => {
          apply("responseDone");
          if (idleRef.current) clearTimeout(idleRef.current);
          idleRef.current = setTimeout(() => {
            const next = apply("idleTimeout");
            if (next === "stopped" || next === "wake-idle") {
              clientRef.current?.close();
              clientRef.current = null;
            }
          }, ASKV_IDLE_MS);
        },
        onError: (message) => {
          setError(message);
          apply("fail");
        },
      });
      clientRef.current = client;
      await client.connect();
      apply("sessionReady");
      apply("greetingDone");
    } catch (err) {
      setError(err instanceof Error ? err.message : "assistant.realtime_failed");
      apply("fail");
    }
  };

  useEffect(() => {
    void getUser().then((user) => {
      if (!user) return;
      void readAskVMuted(user.id).then(setMutedState);
      void readAskVAcrossVndrly(user.id).then((value) => {
        acrossRef.current = value;
        setAcross(value);
      });
    });
  }, []);

  useEffect(() => {
    const sub = subscribeAskVAppState(
      () => undefined,
      () => stop(),
    );
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!acrossVndrly || muted) return;
    if (state === "stopped" || state === "muted" || state === "error" || state === "wake-idle") return;
    clientRef.current?.updateContext({ path: pathname, location: pathname });
  }, [acrossVndrly, muted, pathname, state]);

  const value = useMemo<AskVVoiceSessionValue>(() => ({
    state,
    error,
    greeting,
    muted,
    acrossVndrly,
    wakeSupported: false,
    startConversation,
    stop,
    setMuted: (next) => {
      void getUser().then((user) => {
        if (user) void writeAskVMuted(user.id, next);
      });
      setMutedState(next);
      if (next) {
        clientRef.current?.setMicEnabled(false);
        stop();
      } else {
        void startConversation("unmute");
      }
    },
  }), [acrossVndrly, error, greeting, muted, state]);

  return <AskVVoiceSessionContext.Provider value={value}>{children}</AskVVoiceSessionContext.Provider>;
}

export function useAskVVoiceSession(): AskVVoiceSessionValue {
  return useContext(AskVVoiceSessionContext) ?? {
    state: "stopped",
    error: null,
    greeting: null,
    muted: false,
    acrossVndrly: false,
    wakeSupported: false,
    startConversation: async () => undefined,
    stop: () => undefined,
    setMuted: () => undefined,
  };
}
