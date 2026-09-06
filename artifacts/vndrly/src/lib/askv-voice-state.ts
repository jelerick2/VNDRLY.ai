export const ASKV_IDLE_MS = 5 * 60 * 1000;

export type AskVVoiceState =
  | "stopped"
  | "connecting"
  | "greeting"
  | "listening"
  | "thinking"
  | "speaking"
  | "muted"
  | "wake-idle"
  | "interrupted"
  | "error";

export type AskVVoiceEvent =
  | "open"
  | "unmute"
  | "sessionReady"
  | "greetingDone"
  | "vadEnd"
  | "modelAudio"
  | "responseDone"
  | "bargeIn"
  | "idleTimeout"
  | "mute"
  | "wake"
  | "fail"
  | "stop";

export function nextAskVVoiceState(
  state: AskVVoiceState,
  event: AskVVoiceEvent,
  acrossVndrly = false,
): AskVVoiceState {
  if (event === "mute" && state !== "stopped" && state !== "error") return "muted";
  if (event === "stop") return "stopped";
  if (event === "fail") return "error";

  switch (state) {
    case "stopped":
      return event === "open" || event === "unmute" ? "connecting" : state;
    case "connecting":
      return event === "sessionReady" ? "greeting" : state;
    case "greeting":
      return event === "greetingDone" ? "listening" : state;
    case "listening":
      if (event === "vadEnd") return "thinking";
      if (event === "idleTimeout") return acrossVndrly ? "wake-idle" : "stopped";
      return state;
    case "thinking":
      return event === "modelAudio" ? "speaking" : state;
    case "speaking":
      if (event === "bargeIn") return "interrupted";
      if (event === "responseDone") return "listening";
      return state;
    case "interrupted":
      return event === "vadEnd" ? "thinking" : state;
    case "muted":
      return event === "unmute" || event === "open" ? "connecting" : state;
    case "wake-idle":
      return event === "wake" ? "connecting" : state;
    case "error":
      return event === "open" ? "connecting" : "stopped";
    default:
      return state;
  }
}
