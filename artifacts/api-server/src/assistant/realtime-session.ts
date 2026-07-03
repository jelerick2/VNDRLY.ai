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
