import { describe, expect, it } from "vitest";
import { AskVPendingConfirmationStore } from "./askv-pending-confirmation";

describe("AskV pending confirmation binding", () => {
  it("does not treat a generic yes as approval when nothing is pending", () => {
    const store = new AskVPendingConfirmationStore();
    expect(store.consume("yes", { userId: 10, organizationKey: "vendor:22" })).toBeNull();
  });

  it("binds confirmation to the exact tool, args, user, and organization", () => {
    const store = new AskVPendingConfirmationStore();
    store.set({
      userId: 10,
      organizationKey: "vendor:22",
      toolName: "confirm_visitor_check_in",
      arguments: { firstName: "Bob", lastName: "Villa" },
    });
    expect(store.consume("yes", { userId: 10, organizationKey: "partner:9" })).toBeNull();
    expect(store.consume("yes", { userId: 11, organizationKey: "vendor:22" })).toBeNull();
    const pending = store.consume("yes", { userId: 10, organizationKey: "vendor:22" });
    expect(pending).toEqual({
      userId: 10,
      organizationKey: "vendor:22",
      toolName: "confirm_visitor_check_in",
      arguments: { firstName: "Bob", lastName: "Villa" },
    });
    expect(store.consume("yes", { userId: 10, organizationKey: "vendor:22" })).toBeNull();
  });
});
