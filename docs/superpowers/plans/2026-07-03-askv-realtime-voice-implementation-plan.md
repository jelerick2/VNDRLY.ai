# AskV Realtime Voice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add OpenAI Realtime wake-phrase voice mode to AskV on iOS and web while preserving the existing AskV tool catalog, role gates, text chat, and audit chain.

**Architecture:** The VNDRLY API server remains the authority for tools, permissions, confirmation, and audit logging. Web and iOS voice clients use OpenAI Realtime as the speech transport, but every tool call routes back through the same server-side AskV executor that text chat uses. Text AskV and the existing Whisper/TTS path remain available as fallback while Realtime is introduced.

**Tech Stack:** Expo React Native 0.81 / Expo 54, React 19 / Vite, Express 5, Drizzle / PostgreSQL, Vitest, OpenAI Realtime GA, Anthropic Claude text fallback, existing pnpm 9.15.9 workspace scripts.

---

## Source Spec

- `docs/superpowers/specs/2026-07-03-askv-realtime-voice-design.md`
- Current OpenAI GA Realtime guidance: use `/v1/realtime/client_secrets` for browser or mobile client credentials, use `/v1/realtime/calls` for WebRTC SDP calls, and do not use the old `OpenAI-Beta: realtime=v1` header.
- Current OpenAI transport guidance: WebRTC is preferred for browser/mobile audio; WebSocket is preferred when the server already receives raw audio.

## Scope Check

Keep this as one plan because the server registry, audit chain, Realtime session creation, web client, and iOS client must share one contract. Splitting the work before the server contract exists would risk separate web/mobile tool behavior, which is exactly what this feature is meant to avoid.

## Native Dependency Checkpoint

Web can use built-in browser `RTCPeerConnection`.

The Expo iOS app does not currently include a React Native WebRTC module. Before the iOS Realtime transport task, ask the user to approve adding native WebRTC support such as `react-native-webrtc` plus its Expo config plugin, because `AGENTS.md` requires asking before introducing new external dependencies. The fallback path is to keep iOS on the existing push-to-talk Whisper/TTS voice flow until native WebRTC is approved.

## File Structure

### API Server

- Create `artifacts/api-server/src/assistant/tool-registry.ts`
  - Owns provider-neutral AskV tool definitions.
  - Emits Anthropic and OpenAI Realtime tool schemas.
  - Stores metadata: mutating, high-impact, roles, confirmation mode, audit target hints.
- Create `artifacts/api-server/src/assistant/legacy-anthropic-tools.ts`
  - Holds the existing `DEEP_LINK_SCREENS` and Anthropic `TOOLS` array moved verbatim from `tools.ts`.
  - Lets the registry wrap every current tool without manually rewriting the large catalog in the first refactor.
- Modify `artifacts/api-server/src/assistant/tools.ts`
  - Re-export Anthropic tools from the registry so existing evals and text chat stay stable.
- Create `artifacts/api-server/src/assistant/tool-executor.ts`
  - Moves `runTool` out of `routes/assistant.ts`.
  - Keeps token-mode allow-list defense.
  - Returns a structured execution result for audit and a string result for model tool output.
- Modify `artifacts/api-server/src/routes/assistant.ts`
  - Imports the shared executor and registry.
  - Passes input mode and client context into the executor.
  - Preserves existing text chat endpoints.
- Create `artifacts/api-server/src/assistant/action-classifier.ts`
  - Classifies high-impact tools.
  - Parses confirmation phrases.
  - Normalizes cancellation phrases.
- Create `artifacts/api-server/src/assistant/voice-context.ts`
  - Validates short-lived client context: screen, ticket, site, crew member, GPS, confidence.
- Create `artifacts/api-server/src/assistant/action-audit.ts`
  - Writes transcript plus metadata for every mutating AskV action.
- Create `artifacts/api-server/src/assistant/realtime-session.ts`
  - Builds Realtime session config and calls OpenAI GA client-secret endpoint.
- Create `artifacts/api-server/src/routes/assistantRealtime.ts`
  - `POST /assistant/realtime/client-secret`
  - `POST /assistant/realtime/tool-call`
- Modify `artifacts/api-server/src/routes/index.ts`
  - Mounts the Realtime assistant route.
- Create `lib/db/src/schema/assistantActionAudit.ts`
  - Drizzle schema for AskV action audit rows.
- Modify `lib/db/src/schema/index.ts`
  - Exports the new schema file.
- Create `lib/db/drizzle/chunk_388_assistant_action_audit.sql`
  - Additive SQL migration for the audit table and indexes.

### Web App

- Create `artifacts/vndrly/src/lib/askv-realtime-client.ts`
  - Browser Realtime WebRTC client.
  - Opens data channel, forwards tool calls to VNDRLY API, returns tool outputs to Realtime.
- Create `artifacts/vndrly/src/lib/askv-voice-preferences.ts`
  - Per-user/per-browser Text Only preference in `localStorage`.
- Create `artifacts/vndrly/src/hooks/use-askv-realtime.ts`
  - One-command voice session state machine.
- Create `artifacts/vndrly/src/hooks/use-askv-wake-listener.ts`
  - Wake phrase loop for "AskV" and strict "V".
- Create `artifacts/vndrly/src/components/askv-voice-controller.tsx`
  - Global authenticated controller mounted by web app shells.
- Modify `artifacts/vndrly/src/components/assistant-panel.tsx`
  - Adds remembered Text Only control and Realtime status.
  - Keeps text input and existing push-to-talk fallback available.
- Modify `artifacts/vndrly/src/components/layout.tsx`
  - Mounts `AskVVoiceController` for admin, partner, and vendor web users.
- Modify `artifacts/vndrly/src/components/field-ops-portal-shell.tsx`
  - Mounts `AskVVoiceController` for field employee and foreman web users.

### iOS App

- Create `artifacts/vndrly-mobile/lib/askvRealtimeClient.ts`
  - iOS Realtime client abstraction.
  - Uses native WebRTC after dependency approval.
  - Exposes the same event contract as the web client.
- Create `artifacts/vndrly-mobile/lib/askvVoicePreferences.ts`
  - Per-user/per-device Text Only preference using `expo-secure-store`.
- Create `artifacts/vndrly-mobile/lib/askvWakeListener.ts`
  - Wake phrase loop for authenticated foreground app use.
- Create `artifacts/vndrly-mobile/hooks/useAskVRealtime.ts`
  - One-command Realtime session state machine.
- Create `artifacts/vndrly-mobile/components/AskVVoiceController.tsx`
  - Global logged-in foreground voice controller.
- Modify `artifacts/vndrly-mobile/app/_layout.tsx`
  - Mounts `AskVVoiceController` inside the authenticated root.
- Modify `artifacts/vndrly-mobile/app/(tabs)/askv.tsx`
  - Adds remembered Text Only control and Realtime status.
  - Keeps text chat and existing push-to-talk fallback available.
- Modify `artifacts/vndrly-mobile/app.json`
  - Updates microphone permission copy to mention AskV voice commands while the app is open.

### Tests

- Create `artifacts/api-server/src/assistant/tool-registry.test.ts`
- Create `artifacts/api-server/src/assistant/tool-executor.test.ts`
- Create `artifacts/api-server/src/assistant/action-classifier.test.ts`
- Create `artifacts/api-server/src/assistant/action-audit.test.ts`
- Create `artifacts/api-server/src/assistant/realtime-session.test.ts`
- Create `artifacts/api-server/src/routes/assistantRealtime.test.ts`
- Create `artifacts/vndrly/src/lib/askv-voice-preferences.test.ts`
- Create `artifacts/vndrly/src/hooks/use-askv-realtime.test.tsx`
- Create `artifacts/vndrly/src/hooks/use-askv-wake-listener.test.tsx`
- Create `artifacts/vndrly-mobile/lib/__tests__/askvVoicePreferences.test.ts`
- Create `artifacts/vndrly-mobile/hooks/__tests__/useAskVRealtime.test.tsx`
- Create `artifacts/vndrly-mobile/lib/__tests__/askvWakeListener.test.ts`

---

## Task 1: Provider-Neutral Tool Registry

**Files:**
- Create: `artifacts/api-server/src/assistant/tool-registry.ts`
- Create: `artifacts/api-server/src/assistant/legacy-anthropic-tools.ts`
- Modify: `artifacts/api-server/src/assistant/tools.ts`
- Test: `artifacts/api-server/src/assistant/tool-registry.test.ts`

- [ ] **Step 1: Write the failing registry tests**

```ts
import { describe, expect, it } from "vitest";
import { ASK_V_TOOL_REGISTRY, toAnthropicTools, toRealtimeTools, toolsForRole } from "./tool-registry";

describe("AskV tool registry", () => {
  it("keeps every existing tool name available to the registry", () => {
    const names = ASK_V_TOOL_REGISTRY.map((tool) => tool.name);
    expect(names).toContain("query_tickets");
    expect(names).toContain("query_crew_eta");
    expect(names).toContain("schedule_ticket_crew");
    expect(names).toContain("set_ticket_flag");
    expect(names).toContain("post_ticket_comment");
    expect(new Set(names).size).toBe(names.length);
  });

  it("emits Anthropic tool schema without changing the existing contract", () => {
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

  it("tracks mutating and high-impact metadata separately from schema", () => {
    const schedule = ASK_V_TOOL_REGISTRY.find((tool) => tool.name === "schedule_ticket_crew");
    const markRead = ASK_V_TOOL_REGISTRY.find((tool) => tool.name === "mark_notifications_read");
    expect(schedule?.mutating).toBe(true);
    expect(schedule?.confirmation).toBe("required");
    expect(markRead?.mutating).toBe(true);
    expect(markRead?.confirmation).toBe("none");
  });

  it("role-filters tools before a Realtime session is minted", () => {
    const fieldTools = toolsForRole("field_employee").map((tool) => tool.name);
    expect(fieldTools).toContain("query_ticket_detail");
    expect(fieldTools).toContain("post_ticket_comment");
    expect(fieldTools).not.toContain("query_invoice_summary");
  });
});
```

- [ ] **Step 2: Run the failing test**

Run: `corepack pnpm --filter @workspace/api-server exec vitest run src/assistant/tool-registry.test.ts`

Expected: FAIL because `tool-registry.ts` does not exist.

- [ ] **Step 3: Create the registry module**

```ts
import type { Anthropic } from "@workspace/integrations-anthropic-ai/sdk";
import {
  DEEP_LINK_SCREENS,
  LEGACY_ANTHROPIC_TOOLS,
} from "./legacy-anthropic-tools";

export type AskVRole = "admin" | "partner" | "vendor" | "field_employee" | "any";
export type AskVConfirmationMode = "none" | "required";

export interface AskVToolDefinition {
  name: string;
  description: string;
  inputSchema: Anthropic.Tool["input_schema"];
  roles: AskVRole[];
  mutating: boolean;
  confirmation: AskVConfirmationMode;
  auditTarget?: "ticket" | "notification" | "onboarding" | "message" | "site" | "crew" | "safety" | "hotlist" | "invoice";
}

export interface OpenAIRealtimeTool {
  type: "function";
  name: string;
  description: string;
  parameters: Anthropic.Tool["input_schema"];
}

const ALL_SIGNED_IN_ROLES: AskVRole[] = ["admin", "partner", "vendor", "field_employee"];
const OFFICE_ROLES: AskVRole[] = ["admin", "partner", "vendor"];
const VENDOR_FIELD_ROLES: AskVRole[] = ["admin", "vendor", "field_employee"];

type ToolMetadata = Omit<AskVToolDefinition, "name" | "description" | "inputSchema">;

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
  get_stock_quote: {},
  get_crude_oil_price: {},
  mark_notifications_read: { mutating: true, auditTarget: "notification" },
  schedule_ticket_crew: { roles: OFFICE_ROLES, mutating: true, confirmation: "required", auditTarget: "ticket" },
  set_ticket_flag: { mutating: true, confirmation: "required", auditTarget: "ticket" },
  post_ticket_comment: { roles: VENDOR_FIELD_ROLES, mutating: true, confirmation: "required", auditTarget: "message" },
  deep_link_to: {},
};

export { DEEP_LINK_SCREENS };

export const ASK_V_TOOL_REGISTRY: AskVToolDefinition[] = LEGACY_ANTHROPIC_TOOLS.map((tool) => {
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

export function toolsForRole(role: AskVRole | string | null | undefined): AskVToolDefinition[] {
  const normalized: AskVRole =
    role === "admin" || role === "partner" || role === "vendor" || role === "field_employee"
      ? role
      : "any";
  if (normalized === "any") return ASK_V_TOOL_REGISTRY;
  return ASK_V_TOOL_REGISTRY.filter((tool) => tool.roles.includes(normalized) || tool.roles.includes("any"));
}

export function findAskVTool(name: string): AskVToolDefinition | null {
  return ASK_V_TOOL_REGISTRY.find((tool) => tool.name === name) ?? null;
}
```

- [ ] **Step 4: Move the existing catalog into `legacy-anthropic-tools.ts`**

Move the current `DEEP_LINK_SCREENS` and `TOOLS` declarations from `artifacts/api-server/src/assistant/tools.ts` into `artifacts/api-server/src/assistant/legacy-anthropic-tools.ts`. Preserve the existing import and every existing tool object. The only code rename inside the moved content is:

```ts
export const TOOLS: Anthropic.Tool[] = [
```

becomes:

```ts
export const LEGACY_ANTHROPIC_TOOLS: Anthropic.Tool[] = [
```

- [ ] **Step 5: Re-export Anthropic tools from the old module**

```ts
import { ASK_V_TOOL_REGISTRY, toAnthropicTools } from "./tool-registry";

export { DEEP_LINK_SCREENS } from "./tool-registry";
export const TOOLS = toAnthropicTools(ASK_V_TOOL_REGISTRY);
```

- [ ] **Step 6: Run the registry tests**

Run: `corepack pnpm --filter @workspace/api-server exec vitest run src/assistant/tool-registry.test.ts`

Expected: PASS.

- [ ] **Step 7: Run the existing assistant eval import check**

Run: `corepack pnpm --filter @workspace/api-server run eval:tool-use`

Expected: PASS, proving the text AskV tool catalog still imports.

- [ ] **Step 8: Commit**

```bash
git add artifacts/api-server/src/assistant/tool-registry.ts artifacts/api-server/src/assistant/legacy-anthropic-tools.ts artifacts/api-server/src/assistant/tools.ts artifacts/api-server/src/assistant/tool-registry.test.ts
git commit -m "refactor: centralize askv tool registry"
```

---

## Task 2: Shared Tool Executor

**Files:**
- Create: `artifacts/api-server/src/assistant/tool-executor.ts`
- Modify: `artifacts/api-server/src/routes/assistant.ts`
- Test: `artifacts/api-server/src/assistant/tool-executor.test.ts`

- [ ] **Step 1: Write failing executor tests**

```ts
import { describe, expect, it, vi } from "vitest";
import type { SessionPayload } from "../lib/session";
import { runAssistantTool } from "./tool-executor";

vi.mock("./write-tools", () => ({
  isWriteTool: (name: string) => name === "mark_notifications_read",
  runWriteTool: vi.fn(async () => JSON.stringify({ ok: true, marked: 1 })),
}));

vi.mock("./data-tools", () => ({
  isDataTool: (name: string) => name === "query_tickets",
  runDataTool: vi.fn(async () => JSON.stringify({ items: [] })),
}));

const session: SessionPayload = {
  userId: 11,
  role: "vendor",
  vendorId: 3,
  partnerId: null,
  membershipRole: "admin",
  displayName: "Joe Boggs",
};

describe("runAssistantTool", () => {
  it("refuses non-onboarding tools in token mode", async () => {
    const result = await runAssistantTool({
      name: "query_tickets",
      input: {},
      session,
      cookieHeader: "",
      isTokenMode: true,
      invocation: { inputMode: "web_text" },
    });

    expect(result.ok).toBe(false);
    expect(result.modelContent).toContain("not available in field-employee invite mode");
  });

  it("routes write tools through write executor", async () => {
    const result = await runAssistantTool({
      name: "mark_notifications_read",
      input: { markAll: true },
      session,
      cookieHeader: "",
      invocation: { inputMode: "web_voice", transcript: "clear my alerts" },
    });

    expect(result.ok).toBe(true);
    expect(result.mutating).toBe(true);
    expect(result.modelContent).toContain("\"ok\":true");
  });

  it("returns a structured denied result for unknown tools", async () => {
    const result = await runAssistantTool({
      name: "invented_tool",
      input: {},
      session,
      cookieHeader: "",
      invocation: { inputMode: "ios_voice" },
    });

    expect(result.ok).toBe(false);
    expect(result.modelContent).toContain("Unknown AskV tool");
  });
});
```

- [ ] **Step 2: Run the failing test**

Run: `corepack pnpm --filter @workspace/api-server exec vitest run src/assistant/tool-executor.test.ts`

Expected: FAIL because `tool-executor.ts` does not exist.

- [ ] **Step 3: Create the executor module**

```ts
import type { SessionPayload } from "../lib/session";
import { isDataTool, runDataTool } from "./data-tools";
import { findAskVTool } from "./tool-registry";
import { isWriteTool, runWriteTool } from "./write-tools";

export type AskVInputMode = "web_text" | "web_voice" | "ios_text" | "ios_voice" | "token_text" | "signup_text";

export interface AskVToolInvocation {
  inputMode: AskVInputMode;
  transcript?: string;
  parsedIntent?: unknown;
  confidence?: number;
  confirmationPhrase?: string;
  clientContext?: unknown;
}

export interface RunAssistantToolArgs {
  name: string;
  input: unknown;
  session: SessionPayload;
  cookieHeader: string;
  isTokenMode?: boolean;
  invocation: AskVToolInvocation;
}

export interface RunAssistantToolResult {
  ok: boolean;
  name: string;
  modelContent: string;
  mutating: boolean;
  auditTarget?: string;
  input: unknown;
  output: string;
  invocation: AskVToolInvocation;
}

export const FIELD_TOKEN_ALLOWED_TOOLS = new Set([
  "lookup_user_progress",
  "set_onboarding_field",
  "complete_onboarding_step",
  "deep_link_to",
]);

function denied(name: string, input: unknown, invocation: AskVToolInvocation, message: string): RunAssistantToolResult {
  const modelContent = JSON.stringify({ error: message });
  return {
    ok: false,
    name,
    modelContent,
    mutating: false,
    input,
    output: modelContent,
    invocation,
  };
}

export async function runAssistantTool(args: RunAssistantToolArgs): Promise<RunAssistantToolResult> {
  const tool = findAskVTool(args.name);
  if (!tool) {
    return denied(args.name, args.input, args.invocation, `Unknown AskV tool '${args.name}'.`);
  }

  if (args.isTokenMode && !FIELD_TOKEN_ALLOWED_TOOLS.has(args.name)) {
    return denied(
      args.name,
      args.input,
      args.invocation,
      `Tool '${args.name}' is not available in field-employee invite mode. Stick to onboarding tools and deep links.`,
    );
  }

  if (args.isTokenMode && isWriteTool(args.name)) {
    return denied(
      args.name,
      args.input,
      args.invocation,
      `Tool '${args.name}' is not available in field-employee invite mode.`,
    );
  }

  let output: string;
  if (isWriteTool(args.name)) {
    output = await runWriteTool(args.name, args.input, args.session);
  } else if (isDataTool(args.name)) {
    output = await runDataTool(args.name, args.input, args.session);
  } else {
    output = await runLegacyAssistantTool(args.name, args.input, args.session, args.cookieHeader);
  }

  return {
    ok: !output.includes("\"error\""),
    name: args.name,
    modelContent: output,
    mutating: tool.mutating,
    auditTarget: tool.auditTarget,
    input: args.input,
    output,
    invocation: args.invocation,
  };
}

export async function runLegacyAssistantTool(
  name: string,
  input: unknown,
  session: SessionPayload,
  cookieHeader: string,
): Promise<string> {
  void name;
  void input;
  void session;
  void cookieHeader;
  return JSON.stringify({
    error: "Legacy AskV tool execution has not been moved into tool-executor yet.",
  });
}
```

- [ ] **Step 4: Move switch cases from `routes/assistant.ts` into `runLegacyAssistantTool`**

Move the full body of the existing `switch (name)` from `routes/assistant.ts` into `runLegacyAssistantTool`. Keep helper functions such as `scopeFromSession`, `ensureProgress`, and `setByPath` with the executor module or move only the helpers that executor needs. The route should call `runAssistantTool` and should not contain a local `runTool` function after this step.

- [ ] **Step 5: Update route calls**

```ts
const result = await runAssistantTool({
  name: tu.name,
  input: tu.input,
  session,
  cookieHeader: req.headers.cookie ?? "",
  invocation: {
    inputMode: "web_text",
    clientContext: pageContext,
  },
});
const out = result.modelContent;
```

Use `inputMode: "token_text"` for the token-mode field onboarding route.

- [ ] **Step 6: Run executor and assistant route tests**

Run:

```bash
corepack pnpm --filter @workspace/api-server exec vitest run src/assistant/tool-executor.test.ts src/routes/assistant*.test.ts
```

Expected: PASS.

- [ ] **Step 7: Run API typecheck**

Run: `corepack pnpm --filter @workspace/api-server run typecheck`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add artifacts/api-server/src/assistant/tool-executor.ts artifacts/api-server/src/assistant/tool-executor.test.ts artifacts/api-server/src/routes/assistant.ts
git commit -m "refactor: share askv tool execution"
```

---

## Task 3: Confirmation Classifier

**Files:**
- Create: `artifacts/api-server/src/assistant/action-classifier.ts`
- Test: `artifacts/api-server/src/assistant/action-classifier.test.ts`

- [ ] **Step 1: Write failing confirmation tests**

```ts
import { describe, expect, it } from "vitest";
import { classifyConfirmation, requiresVoiceConfirmation } from "./action-classifier";

describe("AskV action classifier", () => {
  it.each(["confirm", "sounds good", "execute", "do it", "yes", "that's right", "send it", "submit it", "go ahead"])(
    "accepts %s as a confirmation phrase",
    (phrase) => {
      expect(classifyConfirmation(phrase)).toBe("confirm");
    },
  );

  it.each(["no", "cancel", "stop", "never mind", "do not do that"])(
    "accepts %s as a cancellation phrase",
    (phrase) => {
      expect(classifyConfirmation(phrase)).toBe("cancel");
    },
  );

  it("requires confirmation for ticket scheduling, flagging, comments, and final lifecycle actions", () => {
    expect(requiresVoiceConfirmation("schedule_ticket_crew")).toBe(true);
    expect(requiresVoiceConfirmation("set_ticket_flag")).toBe(true);
    expect(requiresVoiceConfirmation("post_ticket_comment")).toBe(true);
    expect(requiresVoiceConfirmation("mark_notifications_read")).toBe(false);
  });
});
```

- [ ] **Step 2: Run the failing test**

Run: `corepack pnpm --filter @workspace/api-server exec vitest run src/assistant/action-classifier.test.ts`

Expected: FAIL because `action-classifier.ts` does not exist.

- [ ] **Step 3: Create classifier**

```ts
import { findAskVTool } from "./tool-registry";

export type ConfirmationDecision = "confirm" | "cancel" | "none";

const CONFIRM_PHRASES = [
  "confirm",
  "sounds good",
  "execute",
  "do it",
  "yes",
  "that's right",
  "thats right",
  "send it",
  "submit it",
  "go ahead",
];

const CANCEL_PHRASES = [
  "no",
  "cancel",
  "stop",
  "never mind",
  "do not do that",
  "don't do that",
];

function normalize(text: string): string {
  return text.trim().toLowerCase().replace(/[.!?]+$/g, "").replace(/\s+/g, " ");
}

export function classifyConfirmation(text: string): ConfirmationDecision {
  const normalized = normalize(text);
  if (CONFIRM_PHRASES.includes(normalized)) return "confirm";
  if (CANCEL_PHRASES.includes(normalized)) return "cancel";
  return "none";
}

export function requiresVoiceConfirmation(toolName: string): boolean {
  return findAskVTool(toolName)?.confirmation === "required";
}
```

- [ ] **Step 4: Run the classifier tests**

Run: `corepack pnpm --filter @workspace/api-server exec vitest run src/assistant/action-classifier.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add artifacts/api-server/src/assistant/action-classifier.ts artifacts/api-server/src/assistant/action-classifier.test.ts
git commit -m "feat: add askv confirmation classifier"
```

---

## Task 4: AskV Action Audit Table And Writer

**Files:**
- Create: `lib/db/src/schema/assistantActionAudit.ts`
- Modify: `lib/db/src/schema/index.ts`
- Create: `lib/db/drizzle/chunk_388_assistant_action_audit.sql`
- Create: `artifacts/api-server/src/assistant/action-audit.ts`
- Test: `artifacts/api-server/src/assistant/action-audit.test.ts`

- [ ] **Step 1: Add Drizzle schema**

```ts
import { pgTable, serial, text, timestamp, integer, jsonb, real, index } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { assistantConversationsTable } from "./assistantConversations";
import { assistantMessagesTable } from "./assistantMessages";

export const assistantActionAuditTable = pgTable(
  "assistant_action_audit",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => usersTable.id, { onDelete: "set null" }),
    actorRole: text("actor_role"),
    actorMembershipRole: text("actor_membership_role"),
    partnerId: integer("partner_id"),
    vendorId: integer("vendor_id"),
    vendorPeopleId: integer("vendor_people_id"),
    clientSurface: text("client_surface").notNull(),
    inputMode: text("input_mode").notNull(),
    provider: text("provider").notNull(),
    conversationId: integer("conversation_id").references(() => assistantConversationsTable.id, { onDelete: "set null" }),
    assistantMessageId: integer("assistant_message_id").references(() => assistantMessagesTable.id, { onDelete: "set null" }),
    toolName: text("tool_name").notNull(),
    actionType: text("action_type").notNull(),
    targetType: text("target_type"),
    targetId: text("target_id"),
    transcriptText: text("transcript_text"),
    parsedIntent: jsonb("parsed_intent"),
    toolInput: jsonb("tool_input"),
    toolOutput: jsonb("tool_output"),
    confidence: real("confidence"),
    confirmationPhrase: text("confirmation_phrase"),
    gpsLatitude: real("gps_latitude"),
    gpsLongitude: real("gps_longitude"),
    gpsAccuracyMeters: real("gps_accuracy_meters"),
    resultStatus: text("result_status").notNull(),
    errorCode: text("error_code"),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    byUser: index("assistant_action_audit_user_idx").on(t.userId, t.createdAt),
    byTool: index("assistant_action_audit_tool_idx").on(t.toolName, t.createdAt),
    byTarget: index("assistant_action_audit_target_idx").on(t.targetType, t.targetId, t.createdAt),
  }),
);

export type AssistantActionAudit = typeof assistantActionAuditTable.$inferSelect;
export type AssistantActionAuditInsert = typeof assistantActionAuditTable.$inferInsert;
```

- [ ] **Step 2: Export schema**

Add this line to `lib/db/src/schema/index.ts`:

```ts
export * from "./assistantActionAudit";
```

- [ ] **Step 3: Add additive SQL chunk**

```sql
CREATE TABLE IF NOT EXISTS "assistant_action_audit" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer REFERENCES "users"("id") ON DELETE set null,
  "actor_role" text,
  "actor_membership_role" text,
  "partner_id" integer,
  "vendor_id" integer,
  "vendor_people_id" integer,
  "client_surface" text NOT NULL,
  "input_mode" text NOT NULL,
  "provider" text NOT NULL,
  "conversation_id" integer REFERENCES "assistant_conversations"("id") ON DELETE set null,
  "assistant_message_id" integer REFERENCES "assistant_messages"("id") ON DELETE set null,
  "tool_name" text NOT NULL,
  "action_type" text NOT NULL,
  "target_type" text,
  "target_id" text,
  "transcript_text" text,
  "parsed_intent" jsonb,
  "tool_input" jsonb,
  "tool_output" jsonb,
  "confidence" real,
  "confirmation_phrase" text,
  "gps_latitude" real,
  "gps_longitude" real,
  "gps_accuracy_meters" real,
  "result_status" text NOT NULL,
  "error_code" text,
  "error_message" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "assistant_action_audit_user_idx"
  ON "assistant_action_audit" ("user_id", "created_at");

CREATE INDEX IF NOT EXISTS "assistant_action_audit_tool_idx"
  ON "assistant_action_audit" ("tool_name", "created_at");

CREATE INDEX IF NOT EXISTS "assistant_action_audit_target_idx"
  ON "assistant_action_audit" ("target_type", "target_id", "created_at");
```

- [ ] **Step 4: Write failing audit writer test**

```ts
import { describe, expect, it, vi } from "vitest";
import type { SessionPayload } from "../lib/session";
import { writeAskVActionAudit } from "./action-audit";

const inserted: unknown[] = [];

vi.mock("@workspace/db", () => ({
  assistantActionAuditTable: { id: "assistant_action_audit" },
  db: {
    insert: () => ({
      values: (value: unknown) => {
        inserted.push(value);
        return { returning: async () => [{ id: 1 }] };
      },
    }),
  },
}));

const session: SessionPayload = {
  userId: 9,
  role: "field_employee",
  membershipRole: "member",
  vendorId: 3,
  partnerId: null,
  displayName: "Joe Boggs",
};

describe("writeAskVActionAudit", () => {
  it("stores transcript and metadata without raw audio", async () => {
    await writeAskVActionAudit({
      session,
      toolName: "post_ticket_comment",
      inputMode: "ios_voice",
      provider: "openai_realtime",
      clientSurface: "ios",
      transcriptText: "tell crew I am onsite",
      parsedIntent: { intent: "post_comment" },
      toolInput: { ticketId: 10959, content: "I am onsite", confirmed: true },
      toolOutput: { ok: true },
      resultStatus: "success",
      targetType: "ticket",
      targetId: "10959",
      confidence: 0.94,
      confirmationPhrase: "confirm",
      gps: { latitude: 31.1, longitude: -102.2, accuracyMeters: 12 },
    });

    expect(inserted[0]).toMatchObject({
      userId: 9,
      actorRole: "field_employee",
      vendorId: 3,
      clientSurface: "ios",
      inputMode: "ios_voice",
      provider: "openai_realtime",
      transcriptText: "tell crew I am onsite",
      gpsLatitude: 31.1,
      gpsLongitude: -102.2,
      gpsAccuracyMeters: 12,
    });
    expect(JSON.stringify(inserted[0])).not.toContain("audioBase64");
  });
});
```

- [ ] **Step 5: Create audit writer**

```ts
import { assistantActionAuditTable, db } from "@workspace/db";
import type { SessionPayload } from "../lib/session";
import type { AskVInputMode } from "./tool-executor";

export interface AskVActionAuditInput {
  session: SessionPayload;
  toolName: string;
  inputMode: AskVInputMode;
  provider: "anthropic_text" | "openai_realtime";
  clientSurface: "web" | "ios";
  conversationId?: number | null;
  assistantMessageId?: number | null;
  transcriptText?: string | null;
  parsedIntent?: unknown;
  toolInput?: unknown;
  toolOutput?: unknown;
  resultStatus: "success" | "failure" | "denied" | "cancelled";
  targetType?: string | null;
  targetId?: string | number | null;
  confidence?: number | null;
  confirmationPhrase?: string | null;
  gps?: { latitude: number; longitude: number; accuracyMeters?: number | null } | null;
  errorCode?: string | null;
  errorMessage?: string | null;
}

export async function writeAskVActionAudit(input: AskVActionAuditInput): Promise<number | null> {
  const [row] = await db
    .insert(assistantActionAuditTable)
    .values({
      userId: input.session.userId ?? null,
      actorRole: input.session.role ?? null,
      actorMembershipRole: input.session.membershipRole ?? null,
      partnerId: input.session.partnerId ?? null,
      vendorId: input.session.vendorId ?? null,
      vendorPeopleId: input.session.vendorPeopleId ?? null,
      clientSurface: input.clientSurface,
      inputMode: input.inputMode,
      provider: input.provider,
      conversationId: input.conversationId ?? null,
      assistantMessageId: input.assistantMessageId ?? null,
      toolName: input.toolName,
      actionType: `AskV performed ${input.toolName} on behalf of ${input.session.displayName ?? "the user"}.`,
      targetType: input.targetType ?? null,
      targetId: input.targetId == null ? null : String(input.targetId),
      transcriptText: input.transcriptText ?? null,
      parsedIntent: input.parsedIntent ?? null,
      toolInput: input.toolInput ?? null,
      toolOutput: input.toolOutput ?? null,
      confidence: input.confidence ?? null,
      confirmationPhrase: input.confirmationPhrase ?? null,
      gpsLatitude: input.gps?.latitude ?? null,
      gpsLongitude: input.gps?.longitude ?? null,
      gpsAccuracyMeters: input.gps?.accuracyMeters ?? null,
      resultStatus: input.resultStatus,
      errorCode: input.errorCode ?? null,
      errorMessage: input.errorMessage ?? null,
    })
    .returning({ id: assistantActionAuditTable.id });
  return row?.id ?? null;
}
```

- [ ] **Step 6: Run tests and schema drift check**

Run:

```bash
corepack pnpm --filter @workspace/api-server exec vitest run src/assistant/action-audit.test.ts
corepack pnpm --filter @workspace/db run check-schema
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add lib/db/src/schema/assistantActionAudit.ts lib/db/src/schema/index.ts lib/db/drizzle/chunk_388_assistant_action_audit.sql artifacts/api-server/src/assistant/action-audit.ts artifacts/api-server/src/assistant/action-audit.test.ts
git commit -m "feat: add askv action audit log"
```

---

## Task 5: Realtime Session Backend

**Files:**
- Create: `artifacts/api-server/src/assistant/realtime-session.ts`
- Create: `artifacts/api-server/src/routes/assistantRealtime.ts`
- Modify: `artifacts/api-server/src/routes/index.ts`
- Test: `artifacts/api-server/src/assistant/realtime-session.test.ts`
- Test: `artifacts/api-server/src/routes/assistantRealtime.test.ts`

- [ ] **Step 1: Write failing session tests**

```ts
import { describe, expect, it, vi } from "vitest";
import { createAskVRealtimeClientSecret, hashSafetyIdentifier } from "./realtime-session";

describe("AskV Realtime session", () => {
  it("uses a stable hashed safety identifier", () => {
    expect(hashSafetyIdentifier(42)).toMatch(/^[a-f0-9]{64}$/);
    expect(hashSafetyIdentifier(42)).toBe(hashSafetyIdentifier(42));
    expect(hashSafetyIdentifier(42)).not.toBe(hashSafetyIdentifier(43));
  });

  it("posts GA client secret request without beta headers", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ value: "ephemeral_secret", expires_at: 1800000000 }),
    }));

    const result = await createAskVRealtimeClientSecret({
      apiKey: "sk-test",
      userId: 42,
      model: "gpt-realtime-2",
      voice: "marin",
      instructions: "You are AskV.",
      tools: [],
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    expect(result.value).toBe("ephemeral_secret");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.openai.com/v1/realtime/client_secrets",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer sk-test",
          "Content-Type": "application/json",
          "OpenAI-Safety-Identifier": hashSafetyIdentifier(42),
        }),
      }),
    );
    expect(JSON.stringify(fetchMock.mock.calls[0][1].headers)).not.toContain("OpenAI-Beta");
  });
});
```

- [ ] **Step 2: Run failing session test**

Run: `corepack pnpm --filter @workspace/api-server exec vitest run src/assistant/realtime-session.test.ts`

Expected: FAIL because `realtime-session.ts` does not exist.

- [ ] **Step 3: Create Realtime session helper**

```ts
import crypto from "crypto";
import type { OpenAIRealtimeTool } from "./tool-registry";

export interface CreateAskVRealtimeClientSecretArgs {
  apiKey: string;
  userId: number;
  model: string;
  voice: string;
  instructions: string;
  tools: OpenAIRealtimeTool[];
  fetchImpl?: typeof fetch;
}

export interface AskVRealtimeClientSecret {
  value: string;
  expires_at?: number;
}

export function hashSafetyIdentifier(userId: number): string {
  return crypto.createHash("sha256").update(`vndrly-user:${userId}`).digest("hex");
}

export async function createAskVRealtimeClientSecret(
  args: CreateAskVRealtimeClientSecretArgs,
): Promise<AskVRealtimeClientSecret> {
  const fetcher = args.fetchImpl ?? fetch;
  const res = await fetcher("https://api.openai.com/v1/realtime/client_secrets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${args.apiKey}`,
      "Content-Type": "application/json",
      "OpenAI-Safety-Identifier": hashSafetyIdentifier(args.userId),
    },
    body: JSON.stringify({
      session: {
        type: "realtime",
        model: args.model,
        instructions: args.instructions,
        audio: {
          output: {
            voice: args.voice,
          },
        },
        tools: args.tools,
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`openai.realtime_client_secret_failed:${res.status}`);
  }

  const data = (await res.json()) as Partial<AskVRealtimeClientSecret>;
  if (!data.value) {
    throw new Error("openai.realtime_client_secret_missing_value");
  }
  return { value: data.value, expires_at: data.expires_at };
}
```

- [ ] **Step 4: Write failing route tests**

```ts
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createRouteApp } from "../test-utils/route-app";
import assistantRealtimeRouter from "./assistantRealtime";

vi.mock("../lib/session", () => ({
  getSessionFromRequest: () => ({
    userId: 42,
    role: "vendor",
    vendorId: 3,
    partnerId: null,
    membershipRole: "admin",
    displayName: "Joe Boggs",
  }),
}));

vi.mock("../assistant/realtime-session", () => ({
  createAskVRealtimeClientSecret: vi.fn(async () => ({ value: "ephemeral_secret", expires_at: 1800000000 })),
}));

describe("assistant realtime routes", () => {
  it("returns an ephemeral client secret for authenticated users", async () => {
    process.env.OPENAI_API_KEY = "sk-test";
    const app = createRouteApp(assistantRealtimeRouter);
    const res = await request(app).post("/assistant/realtime/client-secret").send({});
    expect(res.status).toBe(200);
    expect(res.body.clientSecret.value).toBe("ephemeral_secret");
    expect(JSON.stringify(res.body)).not.toContain("sk-test");
  });
});
```

- [ ] **Step 5: Create Realtime route**

```ts
import { Router, type IRouter } from "express";
import { getSessionFromRequest } from "../lib/session";
import { logger } from "../lib/logger";
import { buildSystemPrompt } from "../assistant/prompts/system";
import { selectDocs } from "../assistant/knowledge";
import { createAskVRealtimeClientSecret } from "../assistant/realtime-session";
import { toRealtimeTools, toolsForRole } from "../assistant/tool-registry";
import { runAssistantTool } from "../assistant/tool-executor";
import { requiresVoiceConfirmation } from "../assistant/action-classifier";
import { writeAskVActionAudit } from "../assistant/action-audit";

const router: IRouter = Router();

function requireSession(req: Parameters<IRouter["get"]>[1] extends (req: infer R, ...args: never[]) => unknown ? R : never, res: any) {
  const session = getSessionFromRequest(req as any);
  if (!session?.userId) {
    res.status(401).json({ error: "Not authenticated", code: "auth.not_authenticated" });
    return null;
  }
  return session;
}

router.post("/assistant/realtime/client-secret", async (req, res) => {
  const session = requireSession(req, res);
  if (!session) return;
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    res.status(503).json({ error: "Realtime voice is not configured", code: "assistant.realtime_unavailable" });
    return;
  }

  const role = session.role === "admin" || session.role === "partner" || session.role === "vendor" || session.role === "field_employee"
    ? session.role
    : "any";
  const tools = toolsForRole(role);
  const systemPrompt = buildSystemPrompt({
    user: {
      userId: session.userId,
      role,
      displayName: session.displayName ?? "there",
      partnerId: session.partnerId ?? null,
      vendorId: session.vendorId ?? null,
      preferredLanguage: null,
    },
    docs: selectDocs(role, ""),
    onboarding: {
      active: false,
      orgType: null,
      currentStep: null,
      completedSteps: [],
      skippedSteps: [],
    },
  });

  try {
    const clientSecret = await createAskVRealtimeClientSecret({
      apiKey,
      userId: session.userId,
      model: process.env.ASKV_REALTIME_MODEL?.trim() || "gpt-realtime-2",
      voice: process.env.ASKV_REALTIME_VOICE?.trim() || "marin",
      instructions: [
        systemPrompt,
        "You are AskV voice mode. Handle one command, call tools when needed, give direct concise answers, and return control to wake-word mode.",
      ].join("\n\n"),
      tools: toRealtimeTools(tools),
    });
    res.json({ clientSecret, toolNames: tools.map((tool) => tool.name) });
  } catch (err) {
    logger.error({ err, userId: session.userId }, "assistant realtime client secret failed");
    res.status(502).json({ error: "Realtime voice failed to initialize", code: "assistant.realtime_failed" });
  }
});

router.post("/assistant/realtime/tool-call", async (req, res) => {
  const session = requireSession(req, res);
  if (!session) return;
  const name = typeof req.body?.name === "string" ? req.body.name : "";
  const input = req.body?.arguments ?? {};
  if (!name) {
    res.status(400).json({ error: "Missing tool name", code: "assistant.realtime_missing_tool" });
    return;
  }

  if (requiresVoiceConfirmation(name) && req.body?.confirmed !== true) {
    res.json({
      requiresConfirmation: true,
      message: "Please confirm before I do that.",
    });
    return;
  }

  const result = await runAssistantTool({
    name,
    input,
    session,
    cookieHeader: req.headers.cookie ?? "",
    invocation: {
      inputMode: req.body?.clientSurface === "ios" ? "ios_voice" : "web_voice",
      transcript: typeof req.body?.transcript === "string" ? req.body.transcript : undefined,
      parsedIntent: req.body?.parsedIntent,
      confidence: typeof req.body?.confidence === "number" ? req.body.confidence : undefined,
      confirmationPhrase: typeof req.body?.confirmationPhrase === "string" ? req.body.confirmationPhrase : undefined,
      clientContext: req.body?.clientContext,
    },
  });

  if (result.mutating) {
    await writeAskVActionAudit({
      session,
      toolName: result.name,
      inputMode: result.invocation.inputMode,
      provider: "openai_realtime",
      clientSurface: req.body?.clientSurface === "ios" ? "ios" : "web",
      transcriptText: result.invocation.transcript ?? null,
      parsedIntent: result.invocation.parsedIntent,
      toolInput: result.input,
      toolOutput: result.output,
      resultStatus: result.ok ? "success" : "failure",
      targetType: result.auditTarget ?? null,
      targetId: req.body?.targetId ?? null,
      confidence: result.invocation.confidence ?? null,
      confirmationPhrase: result.invocation.confirmationPhrase ?? null,
      gps: req.body?.gps ?? null,
    });
  }

  res.json({ ok: result.ok, output: result.modelContent });
});

export default router;
```

- [ ] **Step 6: Mount Realtime route**

```ts
import assistantRealtimeRouter from "./assistantRealtime";

router.use(assistantRealtimeRouter);
```

- [ ] **Step 7: Run route tests**

Run:

```bash
corepack pnpm --filter @workspace/api-server exec vitest run src/assistant/realtime-session.test.ts src/routes/assistantRealtime.test.ts
corepack pnpm --filter @workspace/api-server run typecheck
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add artifacts/api-server/src/assistant/realtime-session.ts artifacts/api-server/src/assistant/realtime-session.test.ts artifacts/api-server/src/routes/assistantRealtime.ts artifacts/api-server/src/routes/assistantRealtime.test.ts artifacts/api-server/src/routes/index.ts
git commit -m "feat: add askv realtime backend"
```

---

## Task 6: Web Realtime Client And Text Only Preference

**Files:**
- Create: `artifacts/vndrly/src/lib/askv-realtime-client.ts`
- Create: `artifacts/vndrly/src/lib/askv-voice-preferences.ts`
- Create: `artifacts/vndrly/src/hooks/use-askv-realtime.ts`
- Test: `artifacts/vndrly/src/lib/askv-voice-preferences.test.ts`
- Test: `artifacts/vndrly/src/hooks/use-askv-realtime.test.tsx`

- [ ] **Step 1: Write preference tests**

```ts
import { describe, expect, it, beforeEach } from "vitest";
import { askvTextOnlyKey, readAskVTextOnly, writeAskVTextOnly } from "./askv-voice-preferences";

describe("web AskV voice preferences", () => {
  beforeEach(() => localStorage.clear());

  it("keys Text Only mode by user id", () => {
    expect(askvTextOnlyKey(42)).toBe("vndrly:askv:text-only:42:v1");
  });

  it("persists Text Only mode", () => {
    writeAskVTextOnly(42, true);
    expect(readAskVTextOnly(42)).toBe(true);
    writeAskVTextOnly(42, false);
    expect(readAskVTextOnly(42)).toBe(false);
  });
});
```

- [ ] **Step 2: Create preference helper**

```ts
export function askvTextOnlyKey(userId: number): string {
  return `vndrly:askv:text-only:${userId}:v1`;
}

export function readAskVTextOnly(userId: number): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(askvTextOnlyKey(userId)) === "1";
}

export function writeAskVTextOnly(userId: number, enabled: boolean): void {
  if (typeof window === "undefined") return;
  if (enabled) window.localStorage.setItem(askvTextOnlyKey(userId), "1");
  else window.localStorage.removeItem(askvTextOnlyKey(userId));
}
```

- [ ] **Step 3: Create web Realtime client**

```ts
const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export interface AskVRealtimeToolCall {
  name: string;
  arguments: unknown;
  callId: string;
  transcript?: string;
  confidence?: number;
  confirmationPhrase?: string;
  clientContext?: unknown;
}

export interface AskVRealtimeClient {
  connect(): Promise<void>;
  close(): void;
  sendToolResult(callId: string, output: string): void;
}

export async function createAskVRealtimeClient(args: {
  onToolCall: (call: AskVRealtimeToolCall) => Promise<string>;
  onTranscript?: (text: string) => void;
  onDone?: () => void;
}): Promise<AskVRealtimeClient> {
  const tokenRes = await fetch(`${BASE}/api/assistant/realtime/client-secret`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  if (!tokenRes.ok) throw new Error("assistant.realtime_unavailable");
  const tokenJson = (await tokenRes.json()) as { clientSecret: { value: string } };
  const ephemeralKey = tokenJson.clientSecret.value;

  const pc = new RTCPeerConnection();
  const audio = document.createElement("audio");
  audio.autoplay = true;
  pc.ontrack = (event) => {
    audio.srcObject = event.streams[0];
  };

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  pc.addTrack(stream.getAudioTracks()[0], stream);

  const channel = pc.createDataChannel("oai-events");
  channel.onmessage = (event) => {
    void (async () => {
      const payload = JSON.parse(event.data);
      if (payload.type === "response.output_audio_transcript.delta" && typeof payload.delta === "string") {
        args.onTranscript?.(payload.delta);
      }
      if (payload.type === "response.done") {
        args.onDone?.();
      }
      if (payload.type === "response.function_call_arguments.done") {
        const output = await args.onToolCall({
          name: payload.name,
          arguments: JSON.parse(payload.arguments || "{}"),
          callId: payload.call_id,
        });
        channel.send(JSON.stringify({
          type: "conversation.item.create",
          item: {
            type: "function_call_output",
            call_id: payload.call_id,
            output,
          },
        }));
        channel.send(JSON.stringify({ type: "response.create" }));
      }
    })();
  };

  return {
    async connect() {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      const sdpRes = await fetch("https://api.openai.com/v1/realtime/calls", {
        method: "POST",
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${ephemeralKey}`,
          "Content-Type": "application/sdp",
        },
      });
      if (!sdpRes.ok) throw new Error("assistant.realtime_sdp_failed");
      await pc.setRemoteDescription({ type: "answer", sdp: await sdpRes.text() });
    },
    close() {
      stream.getTracks().forEach((track) => track.stop());
      channel.close();
      pc.close();
      audio.remove();
    },
    sendToolResult() {},
  };
}
```

- [ ] **Step 4: Create Realtime hook**

```ts
import { useCallback, useRef, useState } from "react";
import { createAskVRealtimeClient } from "@/lib/askv-realtime-client";

export type AskVRealtimeState = "idle" | "connecting" | "listening" | "running" | "speaking" | "error";

export function useAskVRealtime(args: { clientSurface: "web"; clientContext?: unknown }) {
  const [state, setState] = useState<AskVRealtimeState>("idle");
  const [error, setError] = useState<string | null>(null);
  const clientRef = useRef<{ close(): void } | null>(null);

  const startOneCommand = useCallback(async () => {
    if (state !== "idle") return;
    setState("connecting");
    setError(null);
    try {
      const client = await createAskVRealtimeClient({
        onToolCall: async (call) => {
          setState("running");
          const res = await fetch("/api/assistant/realtime/tool-call", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: call.name,
              arguments: call.arguments,
              transcript: call.transcript,
              confidence: call.confidence,
              confirmationPhrase: call.confirmationPhrase,
              clientContext: call.clientContext ?? args.clientContext,
              clientSurface: args.clientSurface,
            }),
          });
          const data = (await res.json()) as { output?: string; message?: string };
          return data.output ?? data.message ?? "";
        },
        onDone: () => {
          clientRef.current?.close();
          clientRef.current = null;
          setState("idle");
        },
      });
      clientRef.current = client;
      await client.connect();
      setState("listening");
    } catch (err) {
      clientRef.current?.close();
      clientRef.current = null;
      setError(err instanceof Error ? err.message : "assistant.realtime_failed");
      setState("error");
    }
  }, [args.clientContext, args.clientSurface, state]);

  const stop = useCallback(() => {
    clientRef.current?.close();
    clientRef.current = null;
    setState("idle");
  }, []);

  return { state, error, startOneCommand, stop };
}
```

- [ ] **Step 5: Run web unit tests**

Run:

```bash
corepack pnpm --filter @workspace/vndrly exec vitest run src/lib/askv-voice-preferences.test.ts src/hooks/use-askv-realtime.test.tsx
corepack pnpm --filter @workspace/vndrly run typecheck
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add artifacts/vndrly/src/lib/askv-realtime-client.ts artifacts/vndrly/src/lib/askv-voice-preferences.ts artifacts/vndrly/src/hooks/use-askv-realtime.ts artifacts/vndrly/src/lib/askv-voice-preferences.test.ts artifacts/vndrly/src/hooks/use-askv-realtime.test.tsx
git commit -m "feat: add web askv realtime client"
```

---

## Task 7: Web Wake Phrase Controller

**Files:**
- Create: `artifacts/vndrly/src/hooks/use-askv-wake-listener.ts`
- Create: `artifacts/vndrly/src/components/askv-voice-controller.tsx`
- Modify: `artifacts/vndrly/src/components/layout.tsx`
- Modify: `artifacts/vndrly/src/components/field-ops-portal-shell.tsx`
- Modify: `artifacts/vndrly/src/components/assistant-panel.tsx`
- Test: `artifacts/vndrly/src/hooks/use-askv-wake-listener.test.tsx`

- [ ] **Step 1: Write wake listener tests**

```ts
import { describe, expect, it } from "vitest";
import { isAskVWakePhrase } from "./use-askv-wake-listener";

describe("AskV wake phrase matching", () => {
  it("accepts AskV at normal confidence", () => {
    expect(isAskVWakePhrase("ask v", 0.72)).toBe(true);
    expect(isAskVWakePhrase("askv", 0.72)).toBe(true);
  });

  it("requires stricter confidence for V", () => {
    expect(isAskVWakePhrase("v", 0.91)).toBe(true);
    expect(isAskVWakePhrase("v", 0.75)).toBe(false);
  });

  it("rejects unrelated text", () => {
    expect(isAskVWakePhrase("schedule Daniel", 0.99)).toBe(false);
  });
});
```

- [ ] **Step 2: Create wake listener hook**

```ts
import { useEffect, useRef } from "react";

export function isAskVWakePhrase(text: string, confidence: number): boolean {
  const normalized = text.trim().toLowerCase().replace(/[^\w\s]/g, "").replace(/\s+/g, " ");
  if (normalized === "askv" || normalized === "ask v") return confidence >= 0.65;
  if (normalized === "v") return confidence >= 0.9;
  return false;
}

export function useAskVWakeListener(args: {
  enabled: boolean;
  onWake: () => void;
}) {
  const onWakeRef = useRef(args.onWake);
  onWakeRef.current = args.onWake;

  useEffect(() => {
    if (!args.enabled) return;
    const SpeechRecognitionCtor =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) return;
    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const result = event.results[event.results.length - 1];
      const alternative = result?.[0];
      if (alternative && isAskVWakePhrase(alternative.transcript, alternative.confidence || 0)) {
        recognition.stop();
        onWakeRef.current();
      }
    };
    recognition.onend = () => {
      if (args.enabled) recognition.start();
    };
    recognition.start();
    return () => recognition.stop();
  }, [args.enabled]);
}
```

- [ ] **Step 3: Create global controller**

```tsx
import { useMemo, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useAskVRealtime } from "@/hooks/use-askv-realtime";
import { useAskVWakeListener } from "@/hooks/use-askv-wake-listener";
import { readAskVTextOnly, writeAskVTextOnly } from "@/lib/askv-voice-preferences";

export function AskVVoiceController() {
  const { user } = useAuth();
  const userId = typeof user?.id === "number" ? user.id : null;
  const [textOnly, setTextOnly] = useState(() => (userId == null ? false : readAskVTextOnly(userId)));
  const realtime = useAskVRealtime({
    clientSurface: "web",
    clientContext: { path: window.location.pathname },
  });

  const enabled = useMemo(
    () => !!userId && !textOnly && document.visibilityState === "visible" && realtime.state === "idle",
    [realtime.state, textOnly, userId],
  );

  useAskVWakeListener({
    enabled,
    onWake: () => void realtime.startOneCommand(),
  });

  if (userId == null) return null;
  return (
    <button
      type="button"
      className="sr-only"
      data-testid="askv-text-only-toggle"
      aria-pressed={textOnly}
      onClick={() => {
        const next = !textOnly;
        setTextOnly(next);
        writeAskVTextOnly(userId, next);
        if (next) realtime.stop();
      }}
    >
      AskV Text Only
    </button>
  );
}
```

- [ ] **Step 4: Mount controller in web shells**

In `layout.tsx` and `field-ops-portal-shell.tsx`, import and render:

```tsx
import { AskVVoiceController } from "@/components/askv-voice-controller";

<AskVVoiceController />
```

Place it inside authenticated shell markup so it is not mounted on login/signup pages.

- [ ] **Step 5: Add visible Text Only toggle to assistant panel**

Add a compact icon button in `assistant-panel.tsx` header. Use existing header button styling:

```tsx
<HeaderIconButton
  onClick={handleToggleTextOnly}
  pressed={textOnly}
  testId="assistant-text-only"
  title={textOnly ? "Text Only is on" : "Text Only is off"}
>
  {textOnly ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
</HeaderIconButton>
```

- [ ] **Step 6: Run web tests**

Run:

```bash
corepack pnpm --filter @workspace/vndrly exec vitest run src/hooks/use-askv-wake-listener.test.tsx src/components/field-ops-portal-shell.test.tsx
corepack pnpm --filter @workspace/vndrly run typecheck
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add artifacts/vndrly/src/hooks/use-askv-wake-listener.ts artifacts/vndrly/src/hooks/use-askv-wake-listener.test.tsx artifacts/vndrly/src/components/askv-voice-controller.tsx artifacts/vndrly/src/components/layout.tsx artifacts/vndrly/src/components/field-ops-portal-shell.tsx artifacts/vndrly/src/components/assistant-panel.tsx
git commit -m "feat: add web askv wake voice mode"
```

---

## Task 8: iOS Realtime Client And Text Only Preference

**Files:**
- Create: `artifacts/vndrly-mobile/lib/askvVoicePreferences.ts`
- Create: `artifacts/vndrly-mobile/lib/askvRealtimeClient.ts`
- Create: `artifacts/vndrly-mobile/hooks/useAskVRealtime.ts`
- Modify: `artifacts/vndrly-mobile/package.json` after native dependency approval
- Modify: `artifacts/vndrly-mobile/app.json`
- Test: `artifacts/vndrly-mobile/lib/__tests__/askvVoicePreferences.test.ts`
- Test: `artifacts/vndrly-mobile/hooks/__tests__/useAskVRealtime.test.tsx`

- [ ] **Step 1: Ask for native dependency approval**

Before editing `package.json`, ask:

```text
The web app can use browser WebRTC directly. The Expo iOS app needs a native WebRTC module to run OpenAI Realtime as true speech-to-speech. Approve adding react-native-webrtc and its Expo config plugin?
```

If the user approves, proceed with this task. If the user declines, skip iOS Realtime transport and keep the existing iOS push-to-talk Whisper/TTS fallback wired to the same server-side tools.

- [ ] **Step 2: Add native WebRTC packages after approval**

Run: `corepack pnpm --filter @workspace/vndrly-mobile add react-native-webrtc @config-plugins/react-native-webrtc`

Expected: `package.json` and `pnpm-lock.yaml` change.

- [ ] **Step 3: Register WebRTC config plugin**

In `artifacts/vndrly-mobile/app.json`, add the plugin entry:

```json
[
  "@config-plugins/react-native-webrtc",
  {
    "cameraPermission": false,
    "microphonePermission": "VNDRLY uses the microphone for AskV voice commands while the app is open."
  }
]
```

Update `NSMicrophoneUsageDescription`:

```json
"NSMicrophoneUsageDescription": "VNDRLY uses the microphone for AskV voice commands while the app is open and for crew voice messages on active tickets."
```

- [ ] **Step 4: Write mobile preference tests**

```ts
import { describe, expect, it, vi } from "vitest";
import { askvTextOnlyKey, readAskVTextOnly, writeAskVTextOnly } from "../askvVoicePreferences";

const store = new Map<string, string>();

vi.mock("expo-secure-store", () => ({
  getItemAsync: vi.fn(async (key: string) => store.get(key) ?? null),
  setItemAsync: vi.fn(async (key: string, value: string) => {
    store.set(key, value);
  }),
  deleteItemAsync: vi.fn(async (key: string) => {
    store.delete(key);
  }),
}));

describe("mobile AskV voice preferences", () => {
  it("persists Text Only mode by user id", async () => {
    expect(askvTextOnlyKey(42)).toBe("vndrly:askv:text-only:42:v1");
    await writeAskVTextOnly(42, true);
    expect(await readAskVTextOnly(42)).toBe(true);
    await writeAskVTextOnly(42, false);
    expect(await readAskVTextOnly(42)).toBe(false);
  });
});
```

- [ ] **Step 5: Create mobile preference helper**

```ts
import * as SecureStore from "expo-secure-store";

export function askvTextOnlyKey(userId: number): string {
  return `vndrly:askv:text-only:${userId}:v1`;
}

export async function readAskVTextOnly(userId: number): Promise<boolean> {
  return (await SecureStore.getItemAsync(askvTextOnlyKey(userId))) === "1";
}

export async function writeAskVTextOnly(userId: number, enabled: boolean): Promise<void> {
  if (enabled) await SecureStore.setItemAsync(askvTextOnlyKey(userId), "1");
  else await SecureStore.deleteItemAsync(askvTextOnlyKey(userId));
}
```

- [ ] **Step 6: Create mobile Realtime client skeleton**

```ts
import { mediaDevices, RTCPeerConnection } from "react-native-webrtc";
import { getApiBase } from "@/lib/api";

export interface MobileAskVRealtimeClient {
  connect(): Promise<void>;
  close(): void;
}

export async function createMobileAskVRealtimeClient(args: {
  token: string;
  onToolCall: (call: { name: string; arguments: unknown; callId: string }) => Promise<string>;
  onDone?: () => void;
}): Promise<MobileAskVRealtimeClient> {
  const tokenRes = await fetch(`${getApiBase()}/api/assistant/realtime/client-secret`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${args.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });
  if (!tokenRes.ok) throw new Error("assistant.realtime_unavailable");
  const tokenJson = (await tokenRes.json()) as { clientSecret: { value: string } };
  const pc = new RTCPeerConnection();
  const stream = await mediaDevices.getUserMedia({ audio: true, video: false });
  stream.getTracks().forEach((track) => pc.addTrack(track, stream));
  const channel = pc.createDataChannel("oai-events");

  channel.onmessage = (event) => {
    void (async () => {
      const payload = JSON.parse(String(event.data));
      if (payload.type === "response.done") args.onDone?.();
      if (payload.type === "response.function_call_arguments.done") {
        const output = await args.onToolCall({
          name: payload.name,
          arguments: JSON.parse(payload.arguments || "{}"),
          callId: payload.call_id,
        });
        channel.send(JSON.stringify({
          type: "conversation.item.create",
          item: {
            type: "function_call_output",
            call_id: payload.call_id,
            output,
          },
        }));
        channel.send(JSON.stringify({ type: "response.create" }));
      }
    })();
  };

  return {
    async connect() {
      const offer = await pc.createOffer({});
      await pc.setLocalDescription(offer);
      const sdpRes = await fetch("https://api.openai.com/v1/realtime/calls", {
        method: "POST",
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${tokenJson.clientSecret.value}`,
          "Content-Type": "application/sdp",
        },
      });
      if (!sdpRes.ok) throw new Error("assistant.realtime_sdp_failed");
      await pc.setRemoteDescription({ type: "answer", sdp: await sdpRes.text() });
    },
    close() {
      stream.getTracks().forEach((track) => track.stop());
      channel.close();
      pc.close();
    },
  };
}
```

- [ ] **Step 7: Create mobile Realtime hook**

```ts
import { useCallback, useRef, useState } from "react";
import { getToken } from "@/lib/auth";
import { getApiBase } from "@/lib/api";
import { createMobileAskVRealtimeClient } from "@/lib/askvRealtimeClient";

export type MobileAskVRealtimeState = "idle" | "connecting" | "listening" | "running" | "error";

export function useAskVRealtime() {
  const [state, setState] = useState<MobileAskVRealtimeState>("idle");
  const [error, setError] = useState<string | null>(null);
  const clientRef = useRef<{ close(): void } | null>(null);

  const startOneCommand = useCallback(async () => {
    if (state !== "idle") return;
    setState("connecting");
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("auth.not_authenticated");
      const client = await createMobileAskVRealtimeClient({
        token,
        onToolCall: async (call) => {
          setState("running");
          const res = await fetch(`${getApiBase()}/api/assistant/realtime/tool-call`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              name: call.name,
              arguments: call.arguments,
              clientSurface: "ios",
            }),
          });
          const data = (await res.json()) as { output?: string; message?: string };
          return data.output ?? data.message ?? "";
        },
        onDone: () => {
          clientRef.current?.close();
          clientRef.current = null;
          setState("idle");
        },
      });
      clientRef.current = client;
      await client.connect();
      setState("listening");
    } catch (err) {
      clientRef.current?.close();
      clientRef.current = null;
      setError(err instanceof Error ? err.message : "assistant.realtime_failed");
      setState("error");
    }
  }, [state]);

  const stop = useCallback(() => {
    clientRef.current?.close();
    clientRef.current = null;
    setState("idle");
  }, []);

  return { state, error, startOneCommand, stop };
}
```

- [ ] **Step 8: Run mobile tests and typecheck**

Run:

```bash
corepack pnpm --filter @workspace/vndrly-mobile exec vitest run lib/__tests__/askvVoicePreferences.test.ts hooks/__tests__/useAskVRealtime.test.tsx
corepack pnpm --filter @workspace/vndrly-mobile run typecheck
```

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add artifacts/vndrly-mobile/package.json pnpm-lock.yaml artifacts/vndrly-mobile/app.json artifacts/vndrly-mobile/lib/askvVoicePreferences.ts artifacts/vndrly-mobile/lib/askvRealtimeClient.ts artifacts/vndrly-mobile/hooks/useAskVRealtime.ts artifacts/vndrly-mobile/lib/__tests__/askvVoicePreferences.test.ts artifacts/vndrly-mobile/hooks/__tests__/useAskVRealtime.test.tsx
git commit -m "feat: add ios askv realtime client"
```

---

## Task 9: iOS Wake Phrase Controller

**Files:**
- Create: `artifacts/vndrly-mobile/lib/askvWakeListener.ts`
- Create: `artifacts/vndrly-mobile/components/AskVVoiceController.tsx`
- Modify: `artifacts/vndrly-mobile/app/_layout.tsx`
- Modify: `artifacts/vndrly-mobile/app/(tabs)/askv.tsx`
- Test: `artifacts/vndrly-mobile/lib/__tests__/askvWakeListener.test.ts`

- [ ] **Step 1: Write wake phrase unit test**

```ts
import { describe, expect, it } from "vitest";
import { isAskVWakePhrase } from "../askvWakeListener";

describe("mobile AskV wake phrase", () => {
  it("accepts AskV and strict V", () => {
    expect(isAskVWakePhrase("AskV", 0.7)).toBe(true);
    expect(isAskVWakePhrase("ask v", 0.7)).toBe(true);
    expect(isAskVWakePhrase("V", 0.91)).toBe(true);
    expect(isAskVWakePhrase("V", 0.75)).toBe(false);
  });
});
```

- [ ] **Step 2: Create wake helper**

```ts
export function isAskVWakePhrase(text: string, confidence: number): boolean {
  const normalized = text.trim().toLowerCase().replace(/[^\w\s]/g, "").replace(/\s+/g, " ");
  if (normalized === "askv" || normalized === "ask v") return confidence >= 0.65;
  if (normalized === "v") return confidence >= 0.9;
  return false;
}
```

- [ ] **Step 3: Create foreground controller**

```tsx
import React, { useEffect, useState } from "react";
import { AppState } from "react-native";
import { useAuth } from "@/hooks/use-auth";
import { useAskVRealtime } from "@/hooks/useAskVRealtime";
import { readAskVTextOnly } from "@/lib/askvVoicePreferences";

export default function AskVVoiceController() {
  const { user } = useAuth();
  const realtime = useAskVRealtime();
  const [textOnly, setTextOnly] = useState(false);
  const userId = typeof user?.id === "number" ? user.id : null;

  useEffect(() => {
    let cancelled = false;
    if (userId == null) {
      setTextOnly(false);
      return;
    }
    readAskVTextOnly(userId).then((value) => {
      if (!cancelled) setTextOnly(value);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (!userId || textOnly) return;
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active") realtime.stop();
    });
    return () => sub.remove();
  }, [realtime, textOnly, userId]);

  return null;
}
```

Add the low-power wake recognizer after the native speech-recognition choice is implemented. Keep the exported phrase matcher tested now so the final recognizer has a pinned confidence rule.

- [ ] **Step 4: Mount controller in root layout**

In `artifacts/vndrly-mobile/app/_layout.tsx`:

```tsx
import AskVVoiceController from "@/components/AskVVoiceController";

<VndrlyPageBackground>
  <AuthGate />
  <AskVVoiceController />
  <ContextPickerModal />
</VndrlyPageBackground>
```

- [ ] **Step 5: Add visible Text Only control to AskV screen**

Use the existing `BubbleIconButton` style in `app/(tabs)/askv.tsx`:

```tsx
<BubbleIconButton
  name={textOnly ? "volume-x" : "volume-2"}
  onPress={toggleTextOnly}
  pressed={textOnly}
  color={colors.mutedForeground}
  activeColor={brand.primary}
  testID="askv-text-only"
/>
```

- [ ] **Step 6: Run mobile tests**

Run:

```bash
corepack pnpm --filter @workspace/vndrly-mobile exec vitest run lib/__tests__/askvWakeListener.test.ts
corepack pnpm --filter @workspace/vndrly-mobile run typecheck
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add artifacts/vndrly-mobile/lib/askvWakeListener.ts artifacts/vndrly-mobile/lib/__tests__/askvWakeListener.test.ts artifacts/vndrly-mobile/components/AskVVoiceController.tsx artifacts/vndrly-mobile/app/_layout.tsx artifacts/vndrly-mobile/app/(tabs)/askv.tsx
git commit -m "feat: add ios askv wake controller"
```

---

## Task 10: Notification Read-Aloud Prompt

**Files:**
- Modify: `artifacts/vndrly/src/components/notifications-bell.tsx`
- Modify: `artifacts/vndrly-mobile/lib/push.ts`
- Modify: `artifacts/vndrly-mobile/app/_layout.tsx`
- Test: `artifacts/vndrly/src/components/notifications-bell.test.tsx`
- Test: `artifacts/vndrly-mobile/lib/__tests__/push.test.ts`

- [ ] **Step 1: Define urgent notification types**

```ts
export const ASKV_URGENT_NOTIFICATION_TYPES = new Set([
  "crew_reassigned",
  "crew_removed",
  "schedule_changed",
  "ticket_kicked_back",
  "safety_event",
  "certification_expiring",
  "compliance_issue",
  "hotlist_awarded",
  "ticket_action_required",
]);

export function askvNotificationPrompt(type: string): string {
  return ASKV_URGENT_NOTIFICATION_TYPES.has(type)
    ? "Urgent notification. Do you want to hear it?"
    : "New notification. Do you want to hear it?";
}
```

- [ ] **Step 2: Wire web notification prompt**

When a new unread notification arrives and Text Only is off, call the Realtime one-command flow with this prompt as the first assistant utterance:

```ts
const prompt = askvNotificationPrompt(notification.type);
void askvVoice.promptYesNo({
  prompt,
  onYes: () => askvVoice.speak(`${notification.title}. ${notification.body ?? ""}`),
  onNo: () => askvVoice.returnToWakeMode(),
});
```

- [ ] **Step 3: Wire iOS foreground notification prompt**

Inside the foreground notification listener, call the same controller-level prompt:

```ts
const prompt = askvNotificationPrompt(String(notification.request.content.data?.type ?? ""));
askvVoicePromptEmitter.emit("notificationPrompt", {
  prompt,
  title: notification.request.content.title ?? "",
  body: notification.request.content.body ?? "",
});
```

- [ ] **Step 4: Run notification tests**

Run:

```bash
corepack pnpm --filter @workspace/vndrly exec vitest run src/components/notifications-bell.test.tsx
corepack pnpm --filter @workspace/vndrly-mobile exec vitest run lib/__tests__/push.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add artifacts/vndrly/src/components/notifications-bell.tsx artifacts/vndrly-mobile/lib/push.ts artifacts/vndrly-mobile/app/_layout.tsx
git commit -m "feat: prompt askv to read notifications"
```

---

## Task 11: Field Operations Voice Tool Coverage

**Files:**
- Modify: `artifacts/api-server/src/assistant/tools.ts`
- Modify: `artifacts/api-server/src/assistant/tool-registry.ts`
- Modify: `artifacts/api-server/src/assistant/write-tools.ts`
- Modify: `artifacts/api-server/src/routes/tickets.ts`
- Test: `artifacts/api-server/src/assistant/write-tools.test.ts`
- Test: `artifacts/api-server/src/routes/tickets*.test.ts`

- [ ] **Step 1: Add registry entries for core field voice actions**

Add these tool names to the registry:

```ts
{
  name: "set_ticket_field_state",
  description:
    "Updates a field employee's ticket lifecycle state for en route, arrived, onsite, offsite, work started, work complete, or close for review. Uses the same server validation as ticket buttons.",
  inputSchema: {
    type: "object",
    properties: {
      ticketId: { type: "number" },
      action: {
        type: "string",
        enum: ["en_route", "arrived", "on_site", "off_site", "start_work", "work_complete", "close_for_review"],
      },
      happenedAt: { type: "string" },
      note: { type: "string" },
      confirmed: { type: "boolean" },
    },
    required: ["ticketId", "action"],
    additionalProperties: false,
  },
  roles: ["admin", "vendor", "field_employee"],
  mutating: true,
  confirmation: "required",
  auditTarget: "ticket",
}
```

- [ ] **Step 2: Add write-tool tests for confirmation**

```ts
it("requires confirmation for close_for_review", async () => {
  const out = await runWriteTool(
    "set_ticket_field_state",
    { ticketId: 10959, action: "close_for_review" },
    fieldEmployeeSession,
  );
  expect(out).toContain("explicit confirmation");
});
```

- [ ] **Step 3: Implement `set_ticket_field_state` by calling existing ticket transition helpers**

Use existing ticket route/lib functions instead of duplicating status rules. The switch must map to the same endpoints and status invariants described in `AGENTS.md`:

```ts
case "set_ticket_field_state":
  return setTicketFieldState(args as SetTicketFieldStateInput, session);
```

The helper must:

- require a valid ticket id
- verify the field employee, vendor, foreman, partner, or admin can access the ticket
- map `en_route` to `lifecycleState = "en_route"`
- map `arrived` to `lifecycleState = "on_location"`
- map `on_site` and `start_work` to `status = "in_progress"` and `lifecycleState = "on_site"`
- map `off_site` to `lifecycleState = "off_site"`
- map `work_complete` to a note plus field state without submitting to partner
- map `close_for_review` to `status = "pending_review"` and `lifecycleState = "off_site"`
- write existing ticket status history through `appendTicketStatusHistory`
- notify vendor office users when `close_for_review` completes

- [ ] **Step 4: Run write tool tests**

Run:

```bash
corepack pnpm --filter @workspace/api-server exec vitest run src/assistant/write-tools.test.ts src/routes/tickets*.test.ts
corepack pnpm --filter @workspace/api-server run typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add artifacts/api-server/src/assistant/tool-registry.ts artifacts/api-server/src/assistant/tools.ts artifacts/api-server/src/assistant/write-tools.ts artifacts/api-server/src/assistant/write-tools.test.ts artifacts/api-server/src/routes/tickets.ts
git commit -m "feat: add field ticket voice actions"
```

---

## Task 12: End-To-End Validation

**Files:**
- Modify only files needed for test repair from prior tasks.

- [ ] **Step 1: Run focused API tests**

Run:

```bash
corepack pnpm --filter @workspace/api-server exec vitest run src/assistant/tool-registry.test.ts src/assistant/tool-executor.test.ts src/assistant/action-classifier.test.ts src/assistant/action-audit.test.ts src/assistant/realtime-session.test.ts src/routes/assistantRealtime.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run focused web tests**

Run:

```bash
corepack pnpm --filter @workspace/vndrly exec vitest run src/lib/askv-voice-preferences.test.ts src/hooks/use-askv-realtime.test.tsx src/hooks/use-askv-wake-listener.test.tsx
```

Expected: PASS.

- [ ] **Step 3: Run focused mobile tests**

Run:

```bash
corepack pnpm --filter @workspace/vndrly-mobile exec vitest run lib/__tests__/askvVoicePreferences.test.ts lib/__tests__/askvWakeListener.test.ts hooks/__tests__/useAskVRealtime.test.tsx
```

Expected: PASS.

- [ ] **Step 4: Run workspace typechecks**

Run:

```bash
corepack pnpm run typecheck
```

Expected: PASS.

- [ ] **Step 5: Run repo validation gates**

Run:

```bash
corepack pnpm run test:api
corepack pnpm run test:web
corepack pnpm run test:mobile
corepack pnpm lint:i18n
```

Expected: PASS.

- [ ] **Step 6: Local manual smoke**

Run local dev:

```bash
powershell -ExecutionPolicy Bypass -File scripts/ensure-local-dev.ps1 -OpenBrowser
```

Manual checks:

- log in as `joe.boggs@winchester.com`
- verify web AskV text still answers with existing tools
- turn Text Only on and confirm wake listening is off
- turn Text Only off and say "AskV"
- issue "what is my latest ticket"
- issue "schedule Daniel Elerick to ticket 10959 for 8am tomorrow"
- verify AskV asks for confirmation
- say "confirm"
- verify the tool call succeeds or returns a real scheduling conflict
- verify `assistant_action_audit` has transcript plus metadata and no raw audio

- [ ] **Step 7: iOS local smoke**

Run:

```bash
corepack pnpm --filter @workspace/vndrly-mobile run dev:local
```

Manual checks:

- log in as `joe.boggs@winchester.com`
- verify home branding still shows Winchester
- open AskV tab and use text AskV
- verify Text Only persists after app restart
- with Text Only off, say "AskV"
- issue one command
- verify AskV returns to wake mode after response
- verify foreground notification prompt says "New notification. Do you want to hear it?"

- [ ] **Step 8: Commit final validation repairs**

```bash
git add .
git commit -m "test: validate askv realtime voice mode"
```

Only commit if Step 8 staged files are real validation repairs. Skip the commit if no files changed.

---

## Task 13: Push And Release Gate

**Files:**
- No code files unless validation finds a specific defect.

- [ ] **Step 1: Confirm clean intentional diff**

Run:

```bash
git status --short --branch
git log --oneline --decorate -8
```

Expected:

- branch is ahead of `origin/main`
- only known pre-existing untracked attached image files remain
- AskV Realtime commits are visible

- [ ] **Step 2: Push**

Run:

```bash
git push origin main
```

Expected: push succeeds.

- [ ] **Step 3: TestFlight build only when the user explicitly asks**

Do not run a TestFlight build from this plan unless the user explicitly requests one in the current turn.

When requested, run:

```bash
powershell -ExecutionPolicy Bypass -File scripts/testflight-build.ps1 -NonInteractive
powershell -ExecutionPolicy Bypass -File scripts/submit-testflight.ps1 -NonInteractive
```

Expected: EAS iOS artifact builds and the submit script uploads it to TestFlight.

---

## Self-Review

### Spec Coverage

- Realtime migration: Tasks 5, 6, 8.
- Shared AskV tool catalog: Tasks 1 and 2.
- Role-gated tools for iOS and web: Tasks 1, 5, 6, 8.
- Wake phrase "AskV" and stricter "V": Tasks 7 and 9.
- One command then return to wake mode: Tasks 6, 7, 8, 9.
- Text Only remembered mute: Tasks 6, 7, 8, 9.
- Voice confirmation phrases: Task 3.
- Audit transcript plus metadata only: Task 4 and Task 5 tool-call route.
- Notification read-aloud prompt: Task 10.
- iOS foreground/open-app limitation: Tasks 8 and 9.
- No raw audio storage: Task 4 test.
- Field operations voice actions: Task 11.
- TestFlight only on explicit instruction: Task 13.

### Placeholder Scan

Plan avoids deferred-code language. Code snippets define concrete function names and file paths.

### Type Consistency

- `AskVInputMode` appears first in Task 2 and is reused by Task 4.
- `OpenAIRealtimeTool` appears first in Task 1 and is reused by Task 5.
- `writeAskVActionAudit` appears first in Task 4 and is called by Task 5.
- `useAskVRealtime` exists as separate web and mobile hooks with distinct file paths.
- `askvTextOnlyKey`, `readAskVTextOnly`, and `writeAskVTextOnly` use the same names on web and mobile.
