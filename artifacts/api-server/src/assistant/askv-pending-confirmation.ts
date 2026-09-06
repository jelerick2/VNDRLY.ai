import { classifyConfirmation } from "./action-classifier";

export interface AskVPendingConfirmation {
  userId: number;
  organizationKey: string;
  toolName: string;
  arguments: unknown;
}

export function organizationKeyFromSession(session: {
  partnerId?: number | null;
  vendorId?: number | null;
}): string {
  if (session.partnerId) return `partner:${session.partnerId}`;
  if (session.vendorId) return `vendor:${session.vendorId}`;
  return "none";
}

export class AskVPendingConfirmationStore {
  private readonly pending = new Map<string, AskVPendingConfirmation>();

  private key(userId: number, organizationKey: string): string {
    return `${userId}:${organizationKey}`;
  }

  set(value: AskVPendingConfirmation): void {
    this.pending.set(this.key(value.userId, value.organizationKey), value);
  }

  clear(userId: number, organizationKey: string): void {
    this.pending.delete(this.key(userId, organizationKey));
  }

  consume(
    phrase: string,
    identity: { userId: number; organizationKey: string },
  ): AskVPendingConfirmation | null {
    if (classifyConfirmation(phrase) !== "confirm") return null;
    const key = this.key(identity.userId, identity.organizationKey);
    const value = this.pending.get(key) ?? null;
    if (value) this.pending.delete(key);
    return value;
  }
}

export const askvPendingConfirmations = new AskVPendingConfirmationStore();
