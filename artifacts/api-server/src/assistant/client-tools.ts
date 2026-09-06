const CLIENT_TOOLS = new Set([
  "open_screen",
  "focus_control",
  "prefill_draft",
  "launch_camera",
  "launch_maps",
  "launch_scanner",
  "start_ticket_entry",
]);

export function isClientTool(name: string): boolean {
  return CLIENT_TOOLS.has(name);
}

export function runClientTool(name: string, input: unknown): string {
  const args = (input ?? {}) as Record<string, unknown>;
  return JSON.stringify({
    ok: true,
    execution: "client",
    intent: { name, arguments: args },
  });
}
