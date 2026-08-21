export type AskVHandsFreePhase =
  | "off"
  | "armed"
  | "listening"
  | "thinking"
  | "speaking";

export type AskVHandsFreeRuntime = {
  enabled: boolean;
  phase: AskVHandsFreePhase;
  streaming: boolean;
  transcribing: boolean;
  speaking: boolean;
  voiceRecording: boolean;
  readAloud: boolean;
};

export type AskVHandsFreeAction =
  | "idle"
  | "start-listening"
  | "wait"
  | "turn-off";

export function nextAskVHandsFreeAction(
  runtime: AskVHandsFreeRuntime,
): AskVHandsFreeAction {
  if (!runtime.enabled) return "idle";
  if (!runtime.readAloud) return "turn-off";
  if (runtime.phase === "off") return "idle";
  if (runtime.streaming || runtime.transcribing || runtime.speaking || runtime.voiceRecording) {
    return "wait";
  }
  if (runtime.phase === "armed") return "start-listening";
  return "idle";
}

export function nextAskVHandsFreePhaseAfterReply(
  current: AskVHandsFreePhase,
  enabled: boolean,
): AskVHandsFreePhase {
  if (!enabled || current === "off") return "off";
  return "speaking";
}

export function nextAskVHandsFreePhaseAfterSpeech(
  current: AskVHandsFreePhase,
  enabled: boolean,
): AskVHandsFreePhase {
  if (!enabled || current === "off") return "off";
  return "armed";
}
