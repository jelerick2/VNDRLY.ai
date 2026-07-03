import { describe, expect, it } from "vitest";
import { classifyConfirmation, requiresVoiceConfirmation } from "./action-classifier";

describe("AskV voice confirmation classifier", () => {
  it("accepts natural confirmation phrases", () => {
    expect(classifyConfirmation("confirm")).toBe("confirm");
    expect(classifyConfirmation("Sounds good.")).toBe("confirm");
    expect(classifyConfirmation("execute")).toBe("confirm");
    expect(classifyConfirmation("do it")).toBe("confirm");
  });

  it("accepts natural cancellation phrases", () => {
    expect(classifyConfirmation("no")).toBe("cancel");
    expect(classifyConfirmation("never mind")).toBe("cancel");
    expect(classifyConfirmation("don't do that")).toBe("cancel");
  });

  it("uses tool metadata for high-impact confirmation", () => {
    expect(requiresVoiceConfirmation("schedule_ticket_crew")).toBe(true);
    expect(requiresVoiceConfirmation("mark_notifications_read")).toBe(false);
  });
});
