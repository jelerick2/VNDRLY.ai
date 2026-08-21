import { describe, expect, it } from "vitest";
import { classifyToolResult } from "./tool-result";

describe("classifyToolResult", () => {
  it("uses structured requiresConfirmation for mutating tool refusals", () => {
    const output = JSON.stringify({
      error: "Please say yes first.",
      requiresConfirmation: true,
    });

    expect(classifyToolResult(output, true)).toBe("requires_confirmation");
  });

  it("treats ordinary tool errors as failures", () => {
    expect(classifyToolResult(JSON.stringify({ error: "Ticket not found." }), true)).toBe("failure");
  });
});
