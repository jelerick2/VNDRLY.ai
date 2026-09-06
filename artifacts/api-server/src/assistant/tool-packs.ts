import {
  ASK_V_TOOL_REGISTRY,
  normalizeAskVRole,
  type AskVRole,
  type AskVToolDefinition,
} from "./tool-registry";

const CORE_TOOLS = new Set([
  "query_attention_briefing",
  "query_notifications",
  "open_screen",
  "focus_control",
  "prefill_draft",
  "launch_camera",
  "launch_maps",
  "launch_scanner",
]);

const GATE_SCREEN_TOOLS = new Set([
  "prepare_visitor_check_in",
  "confirm_visitor_check_in",
  "find_active_visitors",
  "prepare_visitor_check_out",
  "confirm_visitor_check_out",
  "query_active_visitors",
  "query_visits",
]);

const TICKET_SCREEN_TOOLS = new Set([
  "query_ticket_detail",
  "query_tickets",
  "query_ticket_notes",
  "query_ticket_proof_packet",
  "query_ticket_crew",
  "query_ticket_route_eta",
  "query_ticket_logged_miles",
  "set_ticket_lifecycle",
  "close_ticket_for_review",
  "post_ticket_comment",
  "start_ticket_entry",
]);

const SAFETY_SCREEN_TOOLS = new Set([
  "query_safety_events",
  "lookup_safety_metrics",
  "draft_safety_report",
]);

const ROLE_READ_TOOLS: Record<AskVRole, Set<string>> = {
  admin: new Set(["query_tickets", "query_live_crew", "query_crew_eta", "lookup_org_contacts"]),
  partner: new Set(["query_tickets", "query_live_crew", "lookup_site_detail"]),
  vendor: new Set(["query_tickets", "query_live_crew", "query_crew_eta", "lookup_crew_member_status"]),
  field_employee: new Set(["query_tickets", "query_ticket_detail", "query_ticket_route_eta"]),
  any: new Set(["query_tickets"]),
};

function isGatePath(path: string): boolean {
  return /gate|visitor/i.test(path);
}

function isTicketPath(path: string): boolean {
  return /ticket/i.test(path);
}

function isSafetyPath(path: string): boolean {
  return /safety/i.test(path);
}

export function toolsForRealtime(args: {
  role: AskVRole | string | null | undefined;
  path?: string | null;
  entityId?: number | null;
}): AskVToolDefinition[] {
  const role = normalizeAskVRole(args.role);
  const path = args.path ?? "";
  const allowed = new Set<string>(CORE_TOOLS);
  for (const name of ROLE_READ_TOOLS[role] ?? []) allowed.add(name);
  if (isGatePath(path)) {
    for (const name of GATE_SCREEN_TOOLS) allowed.add(name);
  }
  if (isTicketPath(path) || args.entityId) {
    for (const name of TICKET_SCREEN_TOOLS) allowed.add(name);
  }
  if (isSafetyPath(path)) {
    for (const name of SAFETY_SCREEN_TOOLS) allowed.add(name);
  }
  return ASK_V_TOOL_REGISTRY.filter((tool) => {
    if (!allowed.has(tool.name)) return false;
    return tool.roles.includes(role) || tool.roles.includes("any");
  });
}
