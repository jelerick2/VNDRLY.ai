import { describe, expect, it } from "vitest";
import { ASK_V_TOOL_REGISTRY, toAnthropicTools, toRealtimeTools, toolsForRole } from "./tool-registry";

describe("AskV tool registry", () => {
  it("keeps existing AskV data and write tools in one registry", () => {
    const names = ASK_V_TOOL_REGISTRY.map((tool) => tool.name);
    expect(names).toContain("query_tickets");
    expect(names).toContain("query_crew_eta");
    expect(names).toContain("lookup_map_origin");
    expect(names).toContain("query_ticket_route_eta");
    expect(names).toContain("query_ticket_mileage_audit");
    expect(names).toContain("query_ticket_proof_packet");
    expect(names).toContain("schedule_ticket_crew");
    expect(names).toContain("set_ticket_flag");
    expect(names).toContain("post_ticket_comment");
    expect(new Set(names).size).toBe(names.length);
  });

  it("emits the existing Anthropic schema contract", () => {
    const tools = toAnthropicTools(ASK_V_TOOL_REGISTRY);
    const schedule = tools.find((tool) => tool.name === "schedule_ticket_crew");
    expect(schedule?.input_schema.type).toBe("object");
    expect(schedule?.input_schema.required).toContain("ticketId");
    expect(schedule?.input_schema.required).toContain("scheduledStartAt");
  });

  it("emits OpenAI Realtime function tools", () => {
    const tools = toRealtimeTools(ASK_V_TOOL_REGISTRY);
    const schedule = tools.find((tool) => tool.name === "schedule_ticket_crew");
    expect(schedule).toMatchObject({
      type: "function",
      name: "schedule_ticket_crew",
    });
    expect(schedule?.parameters.type).toBe("object");
  });

  it("tracks mutating metadata separately from schema", () => {
    const schedule = ASK_V_TOOL_REGISTRY.find((tool) => tool.name === "schedule_ticket_crew");
    const markRead = ASK_V_TOOL_REGISTRY.find((tool) => tool.name === "mark_notifications_read");
    expect(schedule?.mutating).toBe(true);
    expect(schedule?.confirmation).toBe("required");
    expect(markRead?.mutating).toBe(true);
    expect(markRead?.confirmation).toBe("none");
  });

  it("role-filters office-only tools before a Realtime session is minted", () => {
    const fieldTools = toolsForRole("field_employee").map((tool) => tool.name);
    expect(fieldTools).toContain("query_ticket_detail");
    expect(fieldTools).toContain("query_ticket_proof_packet");
    expect(fieldTools).toContain("query_ticket_logged_miles");
    expect(fieldTools).toContain("query_ticket_route_eta");
    expect(fieldTools).toContain("query_ticket_mileage_audit");
    expect(fieldTools).toContain("lookup_map_origin");
    expect(fieldTools).toContain("post_ticket_comment");
    expect(fieldTools).not.toContain("query_invoice_summary");
    expect(fieldTools).not.toContain("query_crew_route_summary");
  });
});
