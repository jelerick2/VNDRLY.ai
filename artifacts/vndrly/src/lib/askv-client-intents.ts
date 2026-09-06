export type AskVClientIntent = {
  name: string;
  arguments?: Record<string, unknown>;
};

export function parseAskVClientIntent(output: string): AskVClientIntent | null {
  try {
    const parsed = JSON.parse(output) as { execution?: string; intent?: AskVClientIntent };
    if (parsed.execution !== "client" || !parsed.intent?.name) return null;
    return parsed.intent;
  } catch {
    return null;
  }
}

export function applyAskVClientIntent(intent: AskVClientIntent): void {
  window.dispatchEvent(new CustomEvent("askv:client-intent", { detail: intent }));
  if (intent.name === "open_screen") {
    const screen = typeof intent.arguments?.screen === "string" ? intent.arguments.screen : null;
    const path = typeof intent.arguments?.path === "string" ? intent.arguments.path : null;
    const target = path ?? (screen ? `/${screen}` : null);
    if (target) window.history.pushState({}, "", target);
  }
}
