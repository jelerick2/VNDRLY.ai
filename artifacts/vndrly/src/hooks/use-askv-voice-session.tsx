import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useAskVRealtime } from "@/hooks/use-askv-realtime";
import { useAskVWakeListener } from "@/hooks/use-askv-wake-listener";
import {
  readAskVAcrossVndrly,
  readAskVMuted,
  writeAskVMuted,
} from "@/lib/askv-voice-preferences";

interface AskVVoiceSessionValue {
  state: ReturnType<typeof useAskVRealtime>["state"];
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

function speechRecognitionAvailable(): boolean {
  const win = window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown };
  return Boolean(win.SpeechRecognition || win.webkitSpeechRecognition);
}

export function AskVVoiceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [location] = useLocation();
  const userId = typeof user?.userId === "number" ? user.userId : null;
  const [muted, setMutedState] = useState(false);
  const [acrossVndrly, setAcross] = useState(false);
  const voice = useAskVRealtime({ acrossVndrly });

  useEffect(() => {
    if (userId == null) {
      setMutedState(false);
      setAcross(false);
      voice.stop();
      return;
    }
    setMutedState(readAskVMuted(userId));
    setAcross(readAskVAcrossVndrly(userId));
  }, [userId, voice.stop]);

  useEffect(() => {
    const onMute = (event: Event) => {
      const detail = (event as CustomEvent<{ userId?: number; enabled?: boolean }>).detail;
      if (detail?.userId === userId && typeof detail.enabled === "boolean") {
        setMutedState(detail.enabled);
      }
    };
    const onAcross = (event: Event) => {
      const detail = (event as CustomEvent<{ userId?: number; enabled?: boolean }>).detail;
      if (detail?.userId === userId && typeof detail.enabled === "boolean") {
        setAcross(detail.enabled);
      }
    };
    window.addEventListener("askv:muted-changed", onMute);
    window.addEventListener("askv:across-changed", onAcross);
    return () => {
      window.removeEventListener("askv:muted-changed", onMute);
      window.removeEventListener("askv:across-changed", onAcross);
    };
  }, [userId]);

  useEffect(() => {
    if (muted) voice.setMicEnabled(false);
  }, [muted, voice.setMicEnabled]);

  useEffect(() => {
    if (!acrossVndrly || muted) return;
    if (voice.state === "stopped" || voice.state === "muted" || voice.state === "error" || voice.state === "wake-idle") {
      return;
    }
    voice.updateContext({
      path: location,
      org: user?.vendorId ? `vendor:${user.vendorId}` : user?.partnerId ? `partner:${user.partnerId}` : null,
      location,
    });
  }, [acrossVndrly, location, muted, user?.partnerId, user?.vendorId, voice.state, voice.updateContext]);

  useAskVWakeListener({
    enabled: Boolean(userId) && acrossVndrly && !muted && (voice.state === "stopped" || voice.state === "wake-idle"),
    onWake: () => {
      void voice.startConversation("wake phrase", location);
    },
  });

  const value = useMemo<AskVVoiceSessionValue>(() => ({
    state: voice.state,
    error: voice.error,
    greeting: voice.greeting,
    muted,
    acrossVndrly,
    wakeSupported: acrossVndrly && speechRecognitionAvailable(),
    startConversation: voice.startConversation,
    stop: voice.stop,
    setMuted: (next) => {
      if (userId != null) writeAskVMuted(userId, next);
      setMutedState(next);
      if (next) {
        voice.setMicEnabled(false);
        voice.stop();
      } else {
        void voice.startConversation("unmute", window.location.pathname);
      }
    },
  }), [acrossVndrly, muted, userId, voice]);

  return <AskVVoiceSessionContext.Provider value={value}>{children}</AskVVoiceSessionContext.Provider>;
}

export function useAskVVoiceSession(): AskVVoiceSessionValue {
  const value = useContext(AskVVoiceSessionContext);
  if (!value) {
    return {
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
  return value;
}
