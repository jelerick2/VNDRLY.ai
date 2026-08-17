import type { Anthropic } from "@workspace/integrations-anthropic-ai/sdk";
import { DEEP_LINK_SCREENS, TOOLS } from "./tools";

export type AskVRole = "admin" | "partner" | "vendor" | "field_employee" | "any";
export type AskVConfirmationMode = "none" | "required";
export type AskVAuditTarget =
  | "ticket"
  | "notification"
  | "onboarding"
  | "message"
  | "site"
  | "crew"
  | "safety"
  | "hotlist"
  | "invoice";

export interface AskVToolDefinition {
  name: string;
  description: string;
  inputSchema: Anthropic.Tool["input_schema"];
  roles: AskVRole[];
  mutating: boolean;
  confirmation: AskVConfirmationMode;
  auditTarget?: AskVAuditTarget;
}

export interface OpenAIRealtimeTool {
  type: "function";
  name: string;
  description: string;
  parameters: Anthropic.Tool["input_schema"];
}

type ToolMetadata = Omit<AskVToolDefinition, "name" | "description" | "inputSchema">;

const ALL_SIGNED_IN_ROLES: AskVRole[] = ["admin", "partner", "vendor", "field_employee"];
const OFFICE_ROLES: AskVRole[] = ["admin", "partner", "vendor"];
const VENDOR_FIELD_ROLES: AskVRole[] = ["admin", "vendor", "field_employee"];

const DEFAULT_METADATA: ToolMetadata = {
  roles: ALL_SIGNED_IN_ROLES,
  mutating: false,
  confirmation: "none",
};

const TOOL_METADATA: Record<string, Partial<ToolMetadata>> = {
  lookup_user_progress: { auditTarget: "onboarding" },
  start_onboarding: { mutating: true, auditTarget: "onboarding" },
  set_onboarding_field: { mutating: true, confirmation: "required", auditTarget: "onboarding" },
  complete_onboarding_step: { mutating: true, confirmation: "required", auditTarget: "onboarding" },
  finalize_onboarding: { mutating: true, confirmation: "required", auditTarget: "onboarding" },
  lookup_open_invoices: { roles: OFFICE_ROLES, auditTarget: "invoice" },
  lookup_open_tickets: { auditTarget: "ticket" },
  query_tickets: { auditTarget: "ticket" },
  query_gps_trail: { auditTarget: "ticket" },
  query_vendor_performance: { roles: OFFICE_ROLES },
  query_visits: { roles: OFFICE_ROLES },
  query_field_metrics: { roles: OFFICE_ROLES },
  query_invoice_summary: { roles: OFFICE_ROLES, auditTarget: "invoice" },
  query_sales_tax_by_state: { roles: OFFICE_ROLES },
  query_nec1099_summary: { roles: OFFICE_ROLES },
  query_ticket_detail: { auditTarget: "ticket" },
  query_ticket_crew: { auditTarget: "crew" },
  query_ticket_labor: { auditTarget: "ticket" },
  query_ticket_notes: { auditTarget: "ticket" },
  query_work_type_history: { auditTarget: "ticket" },
  query_invoices: { roles: OFFICE_ROLES, auditTarget: "invoice" },
  query_invoice_lines: { roles: OFFICE_ROLES, auditTarget: "invoice" },
  query_ar_aging: { roles: OFFICE_ROLES, auditTarget: "invoice" },
  query_revenue_summary: { roles: OFFICE_ROLES },
  query_crew_cost: { roles: ["admin", "vendor"] },
  query_1099_k_summary: { roles: OFFICE_ROLES },
  query_1099_misc_summary: { roles: OFFICE_ROLES },
  query_safety_events: { auditTarget: "safety" },
  lookup_safety_metrics: { auditTarget: "safety" },
  lookup_site_operational_status: { auditTarget: "site" },
  query_site_locations: { auditTarget: "site" },
  lookup_site_detail: { auditTarget: "site" },
  query_notifications: { auditTarget: "notification" },
  query_live_crew: { roles: OFFICE_ROLES, auditTarget: "crew" },
  lookup_crew_member_status: { roles: OFFICE_ROLES, auditTarget: "crew" },
  query_crew_eta: { roles: OFFICE_ROLES, auditTarget: "crew" },
  query_crew_route_summary: { roles: OFFICE_ROLES, auditTarget: "crew" },
  lookup_map_origin: { auditTarget: "site" },
  query_ticket_route_eta: { auditTarget: "ticket" },
  query_ticket_mileage_audit: { auditTarget: "ticket" },
  estimate_driving_route: { auditTarget: "ticket" },
  query_hotlist_jobs: { roles: OFFICE_ROLES, auditTarget: "hotlist" },
  query_hotlist_bids: { roles: ["admin", "vendor"], auditTarget: "hotlist" },
  query_vendor_catalog: { roles: OFFICE_ROLES },
  query_partner_approvals: { roles: OFFICE_ROLES },
  query_certifications: { roles: ["admin", "vendor"], auditTarget: "crew" },
  lookup_org_contacts: { roles: OFFICE_ROLES },
  query_flagged_tickets: { auditTarget: "ticket" },
  lookup_ticket_payment_status: { roles: OFFICE_ROLES, auditTarget: "ticket" },
  lookup_accounting_connection: { roles: ["admin", "vendor"] },
  query_active_visitors: { roles: OFFICE_ROLES },
  mark_notifications_read: { mutating: true, auditTarget: "notification" },
  schedule_ticket_crew: { roles: OFFICE_ROLES, mutating: true, confirmation: "required", auditTarget: "ticket" },
  set_ticket_flag: { mutating: true, confirmation: "required", auditTarget: "ticket" },
  post_ticket_comment: { roles: VENDOR_FIELD_ROLES, mutating: true, confirmation: "required", auditTarget: "message" },
};

export { DEEP_LINK_SCREENS };

export const ASK_V_TOOL_REGISTRY: AskVToolDefinition[] = TOOLS.map((tool) => {
  const metadata = { ...DEFAULT_METADATA, ...(TOOL_METADATA[tool.name] ?? {}) };
  return {
    name: tool.name,
    description: tool.description ?? "",
    inputSchema: tool.input_schema,
    roles: metadata.roles,
    mutating: metadata.mutating,
    confirmation: metadata.confirmation,
    auditTarget: metadata.auditTarget,
  };
});

export function toAnthropicTools(tools: AskVToolDefinition[]): Anthropic.Tool[] {
  return tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    input_schema: tool.inputSchema,
  }));
}

export function toRealtimeTools(tools: AskVToolDefinition[]): OpenAIRealtimeTool[] {
  return tools.map((tool) => ({
    type: "function",
    name: tool.name,
    description: tool.description,
    parameters: tool.inputSchema,
  }));
}

export function normalizeAskVRole(role: string | null | undefined): AskVRole {
  if (role === "admin" || role === "partner" || role === "vendor" || role === "field_employee") {
    return role;
  }
  return "any";
}

export function toolsForRole(role: AskVRole | string | null | undefined): AskVToolDefinition[] {
  const normalized = normalizeAskVRole(role);
  if (normalized === "any") return ASK_V_TOOL_REGISTRY;
  return ASK_V_TOOL_REGISTRY.filter((tool) => tool.roles.includes(normalized) || tool.roles.includes("any"));
}

export function findAskVTool(name: string): AskVToolDefinition | null {
  return ASK_V_TOOL_REGISTRY.find((tool) => tool.name === name) ?? null;
}
