import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useAskVRealtime } from "@/hooks/use-askv-realtime";
import { useAskVWakeListener } from "@/hooks/use-askv-wake-listener";
import { readAskVTextOnly } from "@/lib/askv-voice-preferences";

export default function AskVVoiceController() {
  const { user } = useAuth();
  const { state, startOneCommand, stop } = useAskVRealtime();
  const [textOnly, setTextOnly] = useState(false);
  const userId = typeof user?.userId === "number" ? user.userId : null;

  useEffect(() => {
    if (userId == null) {
      setTextOnly(false);
      stop();
      return;
    }
    setTextOnly(readAskVTextOnly(userId));
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ userId?: number; enabled?: boolean }>).detail;
      if (detail?.userId === userId && typeof detail.enabled === "boolean") {
        setTextOnly(detail.enabled);
      }
    };
    window.addEventListener("askv:text-only-changed", handler);
    return () => window.removeEventListener("askv:text-only-changed", handler);
  }, [stop, userId]);

  useEffect(() => {
    if (!userId || textOnly) stop();
  }, [stop, textOnly, userId]);

  useAskVWakeListener({
    enabled: Boolean(userId) && !textOnly && state === "idle",
    onWake: () => {
      void startOneCommand("wake phrase");
    },
  });

  return null;
}
