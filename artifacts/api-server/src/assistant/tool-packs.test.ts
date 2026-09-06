import { describe, expect, it } from "vitest";
import { toolsForRealtime } from "./tool-packs";

describe("AskV realtime tool packs", () => {
  it("sends a compact core plus role plus screen pack instead of the full catalog", () => {
    const gate = toolsForRealtime({
      role: "vendor",
      path: "/gatekeeper",
      entityId: 12,
    });
    const names = gate.map((tool) => tool.name);
    expect(names).toContain("query_attention_briefing");
    expect(names).toContain("prepare_visitor_check_in");
    expect(names).toContain("confirm_visitor_check_in");
    expect(names).toContain("open_screen");
    expect(names).not.toContain("query_1099_k_summary");
    expect(names).not.toContain("lookup_accounting_connection");
    expect(new Set(names).size).toBe(names.length);
  });

  it("adds field ticket mutators on ticket screens", () => {
    const names = toolsForRealtime({
      role: "field_employee",
      path: "/tickets/10959",
      entityId: 10959,
    }).map((tool) => tool.name);
    expect(names).toContain("set_ticket_lifecycle");
    expect(names).toContain("close_ticket_for_review");
    expect(names).toContain("post_ticket_comment");
    expect(names).toContain("start_ticket_entry");
    expect(names).not.toContain("confirm_visitor_check_in");
  });

  it("does not hide authorization — denied tools still fail at execution", () => {
    const names = toolsForRealtime({
      role: "field_employee",
      path: "/gatekeeper",
    }).map((tool) => tool.name);
    expect(names).not.toContain("query_invoices");
  });
});
