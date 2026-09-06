import { describe, expect, it } from "vitest";
import { AskVIdempotencyStore } from "./askv-idempotency";

describe("AskV mutation idempotency", () => {
  it("returns the first result for a repeated user+key pair", () => {
    const store = new AskVIdempotencyStore();
    const first = store.remember(10, "gate-check-in-1", { ok: true, visitId: 44 });
    const second = store.remember(10, "gate-check-in-1", { ok: true, visitId: 99 });
    expect(first).toEqual({ hit: false, value: { ok: true, visitId: 44 } });
    expect(second).toEqual({ hit: true, value: { ok: true, visitId: 44 } });
  });

  it("peeks without writing so reconnects can skip the mutation", () => {
    const store = new AskVIdempotencyStore();
    expect(store.peek(10, "gate-check-in-1")).toBeUndefined();
    store.remember(10, "gate-check-in-1", { visitId: 44 });
    expect(store.peek(10, "gate-check-in-1")).toEqual({ visitId: 44 });
  });

  it("does not share keys across users", () => {
    const store = new AskVIdempotencyStore();
    store.remember(10, "same-key", { visitId: 1 });
    const other = store.remember(11, "same-key", { visitId: 2 });
    expect(other).toEqual({ hit: false, value: { visitId: 2 } });
  });
});
