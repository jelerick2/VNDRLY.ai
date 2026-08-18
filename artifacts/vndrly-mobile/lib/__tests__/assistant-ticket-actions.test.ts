import { describe, expect, it } from "vitest";

import {
  askVActionsForTicket,
  askVPromptRoute,
  readInitialAskVPromptParam,
} from "@/lib/assistant-ticket-actions";

describe("askVActionsForTicket", () => {
  it("builds map-aware AskV prompts for a ticket", () => {
    const actions = askVActionsForTicket(42);

    expect(actions.map((action) => action.key)).toEqual([
      "eta",
      "route",
      "mileage",
      "gps",
      "proof",
    ]);
    expect(actions[0].prompt).toContain("current location");
    expect(actions[0].prompt).toContain("ticket #42");
    expect(actions[2].prompt).toContain("expected road miles");
    expect(actions[4].prompt).toContain("proof-to-pay");
    expect(actions[4].prompt).toContain("ticket #42");
  });

  it("encodes prompts into the AskV tab route", () => {
    expect(askVPromptRoute("ETA to ticket #42?")).toBe(
      "/(tabs)/askv?prompt=ETA%20to%20ticket%20%2342%3F",
    );
  });
});

describe("readInitialAskVPromptParam", () => {
  it("reads a string or first array value", () => {
    expect(readInitialAskVPromptParam(" route me ")).toBe("route me");
    expect(readInitialAskVPromptParam(["eta", "ignored"])).toBe("eta");
  });

  it("ignores blank or missing prompt params", () => {
    expect(readInitialAskVPromptParam("   ")).toBeNull();
    expect(readInitialAskVPromptParam(undefined)).toBeNull();
  });
});
