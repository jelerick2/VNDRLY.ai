import { describe, expect, it, vi } from "vitest";
import { createAskVRealtimeClientSecret, hashSafetyIdentifier } from "./realtime-session";

describe("AskV Realtime session", () => {
  it("hashes safety identifiers without exposing user ids", () => {
    const one = hashSafetyIdentifier(42);
    const two = hashSafetyIdentifier(42);
    expect(one).toBe(two);
    expect(one).not.toContain("42");
  });

  it("creates GA client secrets with session audio and tool config", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ value: "ek_test", expires_at: 123 }), { status: 200 }),
    );

    const secret = await createAskVRealtimeClientSecret({
      apiKey: "sk-test",
      userId: 7,
      model: "gpt-realtime-2",
      voice: "marin",
      instructions: "Use AskV tools.",
      tools: [{ type: "function", name: "query_tickets", description: "Query tickets", parameters: { type: "object" } }],
      fetchImpl,
    });

    expect(secret.value).toBe("ek_test");
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api.openai.com/v1/realtime/client_secrets",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer sk-test",
          "OpenAI-Safety-Identifier": hashSafetyIdentifier(7),
        }),
      }),
    );
    const call = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    const [, init] = call;
    expect(JSON.parse(String(init?.body))).toMatchObject({
      session: {
        type: "realtime",
        model: "gpt-realtime-2",
        audio: { output: { voice: "marin" } },
        tools: [{ type: "function", name: "query_tickets" }],
      },
    });
  });
});
