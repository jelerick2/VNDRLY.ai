export interface AskVIdempotencyResult<T> {
  hit: boolean;
  value: T;
}

export class AskVIdempotencyStore {
  private readonly values = new Map<string, unknown>();

  private cacheKey(userId: number, key: string): string {
    return `${userId}:${key}`;
  }

  peek<T>(userId: number, key: string): T | undefined {
    return this.values.get(this.cacheKey(userId, key)) as T | undefined;
  }

  remember<T>(userId: number, key: string, value: T): AskVIdempotencyResult<T> {
    const cacheKey = this.cacheKey(userId, key);
    if (this.values.has(cacheKey)) {
      return { hit: true, value: this.values.get(cacheKey) as T };
    }
    this.values.set(cacheKey, value);
    return { hit: false, value };
  }
}

export function mutationIdempotencyKey(
  userId: number,
  toolName: string,
  input: unknown,
): string {
  const body = JSON.stringify(input ?? {});
  return `${userId}:${toolName}:${body}`;
}

export const askvIdempotency = new AskVIdempotencyStore();
