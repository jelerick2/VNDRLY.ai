import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import express from "express";
import assistantRealtimeRouter from "./assistantRealtime";

const mocks = vi.hoisted(() => ({
  createCall: vi.fn(async () => "answer-sdp"),
  createSecret: vi.fn(async () => ({ value: "ek_test", expires_at: 123 })),
  session: {
    userId: 10,
    role: "vendor",
    vendorId: 22,
    partnerId: null,
    vendorPeopleId: null,
    displayName: "Vendor User",
  } as {
    userId: number;
    role: string;
    vendorId: number | null;
    partnerId: number | null;
    vendorPeopleId: number | null;
    displayName: string;
  },
}));

vi.mock("../lib/session", () => ({
  getSessionFromRequest: () => mocks.session,
}));

vi.mock("@workspace/db", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(async () => []),
        })),
      })),
    })),
  },
  usersTable: { id: "users.id" },
  onboardingProgressTable: {
    partnerId: "onboarding.partnerId",
    vendorId: "onboarding.vendorId",
    vendorPeopleId: "onboarding.vendorPeopleId",
  },
}));

vi.mock("../assistant/realtime-session", async () => {
  const actual = await vi.importActual<typeof import("../assistant/realtime-session")>(
    "../assistant/realtime-session",
  );
  return {
    ...actual,
    createAskVRealtimeCall: mocks.createCall,
    createAskVRealtimeClientSecret: mocks.createSecret,
  };
});

vi.mock("./assistant", () => ({
  runTool: vi.fn(async () => JSON.stringify({ ok: true })),
}));

function app() {
  const app = express();
  app.use(express.json());
  app.use(assistantRealtimeRouter);
  return app;
}

describe("AskV Realtime routes", () => {
  beforeEach(() => {
    mocks.session = {
      userId: 10,
      role: "vendor",
      vendorId: 22,
      partnerId: null,
      vendorPeopleId: null,
      displayName: "Vendor User",
    };
    mocks.createCall.mockClear();
    mocks.createSecret.mockClear();
  });

  it("creates a server-mediated Realtime WebRTC call from browser SDP", async () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-test");
    vi.stubEnv("ASKV_REALTIME_MODEL", "");

    const res = await request(app())
      .post("/assistant/realtime/call")
      .set("Content-Type", "application/sdp")
      .send("offer-sdp")
      .expect(200);

    expect(res.text).toBe("answer-sdp");
    expect(res.headers["content-type"]).toContain("application/sdp");
    expect(mocks.createCall).toHaveBeenCalledWith(
      expect.objectContaining({
        apiKey: "sk-test",
        userId: 10,
        model: "gpt-realtime-2.1",
        voice: "marin",
        sdp: "offer-sdp",
        tools: expect.arrayContaining([
          expect.objectContaining({
            type: "function",
            name: "query_ticket_route_eta",
          }),
        ]),
      }),
    );
  });

  it("returns tool metadata with the ephemeral client secret", async () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-test");
    vi.stubEnv("ASKV_REALTIME_MODEL", "");

    const res = await request(app())
      .post("/assistant/realtime/client-secret")
      .send({ seedMessage: "route me to ticket 42" })
      .expect(200);

    expect(res.body.clientSecret).toEqual({ value: "ek_test", expires_at: 123 });
    expect(res.body.toolMetadata).toContainEqual({
      name: "schedule_ticket_crew",
      mutating: true,
      confirmation: "required",
      auditTarget: "ticket",
    });
    expect(res.body.toolMetadata).toContainEqual(
      expect.objectContaining({
        name: "query_ticket_route_eta",
        mutating: false,
        confirmation: "none",
      }),
    );
    expect(mocks.createSecret).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gpt-realtime-2.1",
      }),
    );
  });

  it("refuses tool calls outside the authenticated role even if posted manually", async () => {
    mocks.session = {
      userId: 11,
      role: "field_employee",
      vendorId: 22,
      partnerId: null,
      vendorPeopleId: 44,
      displayName: "Field User",
    };

    const res = await request(app())
      .post("/assistant/realtime/tool-call")
      .send({
        name: "query_invoice_summary",
        arguments: {},
        clientSurface: "ios",
      })
      .expect(403);

    expect(res.body).toMatchObject({
      code: "assistant.tool_not_allowed",
    });
  });
});
