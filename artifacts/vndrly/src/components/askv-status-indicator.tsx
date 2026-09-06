import { useAskVVoiceSession } from "@/hooks/use-askv-voice-session";

const LABELS: Record<string, string> = {
  listening: "Listening",
  thinking: "Thinking",
  speaking: "Speaking",
  "wake-idle": "Wake enabled",
  muted: "Muted",
};

export default function AskVStatusIndicator() {
  const { state, muted, acrossVndrly, wakeSupported } = useAskVVoiceSession();
  const label = muted
    ? "Muted"
    : state === "wake-idle"
      ? (wakeSupported && acrossVndrly ? "Wake enabled" : "AskV")
      : LABELS[state];
  if (!label) return null;
  return (
    <span
      data-testid="askv-status-indicator"
      className="inline-flex items-center rounded-full border border-sidebar-border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide"
    >
      {label}
    </span>
  );
}
