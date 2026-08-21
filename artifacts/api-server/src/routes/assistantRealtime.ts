import { Router, text, type IRouter, type Request, type Response } from "express";
import {
  usersTable,
  onboardingProgressTable,
  db,
} from "@workspace/db";
import { eq } from "drizzle-orm";
import { getSessionFromRequest, type SessionPayload } from "../lib/session";
import { logger } from "../lib/logger";
import { selectDocs, type KnowledgeRole } from "../assistant/knowledge";
import { buildSystemPrompt } from "../assistant/prompts/system";
import {
  DEFAULT_ASKV_REALTIME_MODEL,
  createAskVRealtimeCall,
  createAskVRealtimeClientSecret,
} from "../assistant/realtime-session";
import {
  findAskVTool,
  normalizeAskVRole,
  toRealtimeToolMetadata,
  toRealtimeTools,
  toolsForRole,
} from "../assistant/tool-registry";
import { classifyConfirmation, requiresVoiceConfirmation } from "../assistant/action-classifier";
import { writeAskVActionAudit, type AskVClientSurface, type AskVInputMode } from "../assistant/action-audit";
import { classifyToolResult } from "../assistant/tool-result";
import { runTool } from "./assistant";

const router: IRouter = Router();
const parseRealtimeSdp = text({ type: ["application/sdp", "text/plain"], limit: "1mb" });

function requireSession(req: Request, res: Response): SessionPayload | null {
  const session = getSessionFromRequest(req);
  if (!session?.userId) {
    res.status(401).json({ error: "Not authenticated", code: "auth.not_authenticated" });
    return null;
  }
  return session;
}

function normalizeRole(role: string | null | undefined): KnowledgeRole {
  if (role === "admin" || role === "partner" || role === "vendor" || role === "field_employee") {
    return role;
  }
  return "any";
}

function normalizeSurface(value: unknown): AskVClientSurface {
  return value === "ios" || value === "web" || value === "api" ? value : "api";
}

function inputModeFor(surface: AskVClientSurface): AskVInputMode {
  return surface === "ios" ? "ios_voice" : "web_voice";
}

function parseToolArguments(value: unknown): unknown {
  if (typeof value === "string") {
    try {
      return stripNullToolArguments(JSON.parse(value));
    } catch {
      return {};
    }
  }
  return stripNullToolArguments(value ?? {});
}

function stripNullToolArguments(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => stripNullToolArguments(item));
  }
  if (!value || typeof value !== "object") return value;

  const cleaned: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    if (child === null) continue;
    cleaned[key] = stripNullToolArguments(child);
  }
  return cleaned;
}

function toolInputWithConfirmation(input: unknown, confirmed: boolean): unknown {
  if (!confirmed) return input;
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { confirmed: true };
  }
  return { ...input, confirmed: true };
}

async function buildRealtimeInstructions(session: SessionPayload, seedMessage: string): Promise<string> {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId!)).limit(1);
  const role = normalizeRole(session.role);
  const docs = selectDocs(role, seedMessage);
  const onboarding = {
    active: false,
    orgType: null as "partner" | "vendor" | "field_employee" | null,
    currentStep: null as string | null,
    completedSteps: [] as string[],
    skippedSteps: [] as string[],
  };

  const scope = (() => {
    if (session.partnerId) return { orgType: "partner" as const, partnerId: session.partnerId };
    if (session.vendorId) return { orgType: "vendor" as const, vendorId: session.vendorId };
    if (session.vendorPeopleId) return { orgType: "field_employee" as const, vendorPeopleId: session.vendorPeopleId };
    return null;
  })();

  if (scope) {
    const where = scope.orgType === "partner"
      ? eq(onboardingProgressTable.partnerId, scope.partnerId)
      : scope.orgType === "vendor"
      ? eq(onboardingProgressTable.vendorId, scope.vendorId)
      : eq(onboardingProgressTable.vendorPeopleId, scope.vendorPeopleId);
    const [progress] = await db.select().from(onboardingProgressTable).where(where).limit(1);
    if (progress && !progress.completedAt) {
      onboarding.active = true;
      onboarding.orgType = progress.orgType as "partner" | "vendor" | "field_employee";
      onboarding.currentStep = progress.currentStep;
      onboarding.completedSteps = progress.completedSteps;
      onboarding.skippedSteps = progress.skippedSteps;
    }
  }

  return `${buildSystemPrompt({
    user: {
      userId: session.userId!,
      role,
      displayName: user?.displayName ?? session.displayName ?? "there",
      partnerId: session.partnerId ?? null,
      vendorId: session.vendorId ?? null,
      preferredLanguage: (user?.preferredLanguage as "en" | "es" | null) ?? null,
    },
    docs,
    onboarding,
  })}

VOICE MODE
- You are AskV speaking aloud. Sound like a concise American English operations expert: direct, professional, and positive without fluff.
- Lead with the answer or action result whenever possible. If you can do the requested action through a tool, do it after required confirmation instead of giving a manual procedure.
- Handle one command, then end the response so the client can return to wake-phrase mode.
- For mutating tools, ask for voice confirmation before execution. Accept natural confirmations such as "confirm", "sounds good", "execute", "do it", "yes", "send it", "submit it", and "go ahead".
- Do not store or request raw audio. The server audit trail records transcript plus metadata only.`;
}

router.post("/assistant/realtime/client-secret", async (req, res): Promise<void> => {
  const session = requireSession(req, res);
  if (!session) return;

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    res.status(503).json({ error: "OpenAI API key is not configured", code: "assistant.openai_missing" });
    return;
  }

  const role = normalizeAskVRole(session.role);
  const roleTools = toolsForRole(role);
  const seedMessage = typeof req.body?.seedMessage === "string" ? req.body.seedMessage : "voice command";

  try {
    const clientSecret = await createAskVRealtimeClientSecret({
      apiKey,
      userId: session.userId!,
      model: process.env.ASKV_REALTIME_MODEL?.trim() || DEFAULT_ASKV_REALTIME_MODEL,
      voice: process.env.ASKV_REALTIME_VOICE?.trim() || "marin",
      instructions: await buildRealtimeInstructions(session, seedMessage),
      tools: toRealtimeTools(roleTools),
    });

    res.json({
      clientSecret,
      toolNames: roleTools.map((tool) => tool.name),
      toolMetadata: toRealtimeToolMetadata(roleTools),
    });
  } catch (err) {
    logger.error({ err, userId: session.userId }, "AskV Realtime client-secret creation failed");
    res.status(502).json({ error: "Realtime voice is unavailable", code: "assistant.realtime_unavailable" });
  }
});

router.post(
  "/assistant/realtime/call",
  parseRealtimeSdp,
  async (req, res): Promise<void> => {
    const session = requireSession(req, res);
    if (!session) return;

    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      res.status(503).json({ error: "OpenAI API key is not configured", code: "assistant.openai_missing" });
      return;
    }

    const sdp = typeof req.body === "string" ? req.body : "";
    if (!sdp.trim()) {
      res.status(400).json({ error: "Missing SDP offer", code: "assistant.realtime_missing_sdp" });
      return;
    }

    const role = normalizeAskVRole(session.role);
    const roleTools = toolsForRole(role);
    const seedMessage = typeof req.query?.seedMessage === "string" ? req.query.seedMessage : "voice command";

    try {
      const answer = await createAskVRealtimeCall({
        apiKey,
        userId: session.userId!,
        model: process.env.ASKV_REALTIME_MODEL?.trim() || DEFAULT_ASKV_REALTIME_MODEL,
        voice: process.env.ASKV_REALTIME_VOICE?.trim() || "marin",
        instructions: await buildRealtimeInstructions(session, seedMessage),
        tools: toRealtimeTools(roleTools),
        sdp,
      });
      res.type("application/sdp").send(answer);
    } catch (err) {
      logger.error({ err, userId: session.userId }, "AskV Realtime WebRTC call creation failed");
      res.status(502).json({ error: "Realtime voice is unavailable", code: "assistant.realtime_unavailable" });
    }
  },
);

router.post("/assistant/realtime/tool-call", async (req, res): Promise<void> => {
  const session = requireSession(req, res);
  if (!session) return;

  const name = typeof req.body?.name === "string" ? req.body.name : "";
  const tool = name ? findAskVTool(name) : null;
  if (!tool) {
    res.status(400).json({ error: "Unknown AskV tool", code: "assistant.unknown_tool" });
    return;
  }
  const role = normalizeAskVRole(session.role);
  const allowed = tool.roles.includes(role) || tool.roles.includes("any");
  if (!allowed) {
    res.status(403).json({ error: "AskV tool is not available to this role", code: "assistant.tool_not_allowed" });
    return;
  }

  const surface = normalizeSurface(req.body?.clientSurface);
  const input = parseToolArguments(req.body?.arguments ?? req.body?.input);
  const transcriptText = typeof req.body?.transcriptText === "string" ? req.body.transcriptText : null;
  const confirmationPhrase = typeof req.body?.confirmationPhrase === "string" ? req.body.confirmationPhrase : null;
  const decision = confirmationPhrase ? classifyConfirmation(confirmationPhrase) : "none";
  const confirmed = req.body?.confirmed === true || decision === "confirm";
  const cancelled = decision === "cancel";
  const targetId = typeof input === "object" && input != null && "ticketId" in input
    ? (input as { ticketId?: unknown }).ticketId
    : req.body?.targetId;

  if (cancelled) {
    if (tool.mutating) {
      await writeAskVActionAudit({
        session,
        clientSurface: surface,
        inputMode: inputModeFor(surface),
        provider: "openai_realtime",
        toolName: name,
        targetType: tool.auditTarget ?? null,
        targetId: targetId as string | number | null,
        transcriptText,
        toolInput: input,
        confirmationPhrase,
        resultStatus: "cancelled",
      });
    }
    res.json({ ok: false, cancelled: true, output: "Cancelled." });
    return;
  }

  if (requiresVoiceConfirmation(name) && !confirmed) {
    if (tool.mutating) {
      await writeAskVActionAudit({
        session,
        clientSurface: surface,
        inputMode: inputModeFor(surface),
        provider: "openai_realtime",
        toolName: name,
        targetType: tool.auditTarget ?? null,
        targetId: targetId as string | number | null,
        transcriptText,
        toolInput: input,
        resultStatus: "requires_confirmation",
      });
    }
    res.json({
      ok: false,
      requiresConfirmation: true,
      message: "Please confirm before I do that.",
    });
    return;
  }

  try {
    const executableInput = requiresVoiceConfirmation(name)
      ? toolInputWithConfirmation(input, confirmed)
      : input;
    const output = await runTool(name, executableInput, session, req.headers.cookie ?? "");
    const status = classifyToolResult(output, tool.mutating);
    if (tool.mutating) {
      await writeAskVActionAudit({
        session,
        clientSurface: surface,
        inputMode: inputModeFor(surface),
        provider: "openai_realtime",
        toolName: name,
        targetType: tool.auditTarget ?? null,
        targetId: targetId as string | number | null,
        transcriptText,
        toolInput: executableInput,
        toolOutput: output,
        confirmationPhrase,
        resultStatus: status,
        errorCode: status === "failure" ? "assistant.tool_failed" : null,
      });
    }
    res.json({ ok: status === "success", output });
  } catch (err) {
    logger.error({ err, userId: session.userId, toolName: name }, "AskV Realtime tool call failed");
    if (tool.mutating) {
      await writeAskVActionAudit({
        session,
        clientSurface: surface,
        inputMode: inputModeFor(surface),
        provider: "openai_realtime",
        toolName: name,
        targetType: tool.auditTarget ?? null,
        targetId: targetId as string | number | null,
        transcriptText,
        toolInput: input,
        confirmationPhrase,
        resultStatus: "failure",
        errorCode: "assistant.tool_exception",
        errorMessage: err instanceof Error ? err.message : String(err),
      });
    }
    res.status(500).json({ error: "Tool call failed", code: "assistant.tool_failed" });
  }
});

export default router;
