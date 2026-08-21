export type AskVToolResultStatus = "success" | "failure" | "requires_confirmation";

export function classifyToolResult(output: string, mutating: boolean): AskVToolResultStatus {
  try {
    const parsed = JSON.parse(output) as {
      error?: unknown;
      requiresConfirmation?: unknown;
      ok?: unknown;
    };
    if (mutating && parsed.requiresConfirmation === true) return "requires_confirmation";
    if (parsed.error || parsed.ok === false) return "failure";
  } catch {
    // Non-JSON tool output is still a completed tool call from the model's perspective.
  }
  return "success";
}
