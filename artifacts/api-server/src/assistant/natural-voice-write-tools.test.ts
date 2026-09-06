import { describe, expect, it } from "vitest";
import { AskVIdempotencyStore, mutationIdempotencyKey } from "./askv-idempotency";
import { draftSafetyReport, prepareVisitorCheckIn } from "./natural-voice-write-tools";

describe("AskV natural-voice write tools", () => {
  it("prepares a gate check-in and lists missing fields", async () => {
    const incomplete = JSON.parse(await prepareVisitorCheckIn({ vehiclePlate: "ABC123" }));
    expect(incomplete.ok).toBe(false);
    expect(incomplete.missing).toEqual(["firstName", "lastName", "siteLocationId", "hostType"]);

    const ready = JSON.parse(await prepareVisitorCheckIn({
      firstName: "Bob",
      lastName: "Villa",
      siteLocationId: 9,
      hostType: "vendor",
    }));
    expect(ready.ok).toBe(true);
    expect(ready.missing).toEqual([]);
  });

  it("drafts a safety report without submitting it", async () => {
    const draft = JSON.parse(await draftSafetyReport({
      title: "Near miss",
      siteLocationId: 3,
      eventType: "near_miss",
    }));
    expect(draft).toMatchObject({
      ok: true,
      action: "draft_safety_report",
      submitted: false,
    });
  });

  it("keeps mutation keys stable so reconnects can reuse the first result", () => {
    const store = new AskVIdempotencyStore();
    const key = mutationIdempotencyKey(10, "confirm_visitor_check_in", { firstName: "Bob" });
    expect(store.peek(10, key)).toBeUndefined();
    store.remember(10, key, { visitId: 44 });
    expect(store.peek(10, key)).toEqual({ visitId: 44 });
    expect(store.remember(10, key, { visitId: 99 }).value).toEqual({ visitId: 44 });
  });
});
