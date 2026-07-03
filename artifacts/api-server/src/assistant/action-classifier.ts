import { findAskVTool } from "./tool-registry";

export type ConfirmationDecision = "confirm" | "cancel" | "none";

const CONFIRM_PHRASES = new Set([
  "confirm",
  "sounds good",
  "execute",
  "do it",
  "yes",
  "that's right",
  "thats right",
  "send it",
  "submit it",
  "go ahead",
]);

const CANCEL_PHRASES = new Set([
  "no",
  "cancel",
  "stop",
  "never mind",
  "do not do that",
  "don't do that",
]);

function normalize(text: string): string {
  return text.trim().toLowerCase().replace(/[.!?]+$/g, "").replace(/\s+/g, " ");
}

export function classifyConfirmation(text: string): ConfirmationDecision {
  const normalized = normalize(text);
  if (CONFIRM_PHRASES.has(normalized)) return "confirm";
  if (CANCEL_PHRASES.has(normalized)) return "cancel";
  return "none";
}

export function requiresVoiceConfirmation(toolName: string): boolean {
  return findAskVTool(toolName)?.confirmation === "required";
}
