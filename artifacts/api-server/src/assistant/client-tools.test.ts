import { describe, expect, it } from "vitest";
import { isClientTool, runClientTool } from "./client-tools";

describe("AskV client tools", () => {
  it("returns structured intents instead of claiming the server did the UI", () => {
    for (const name of ["open_screen", "focus_control", "prefill_draft", "launch_camera", "launch_maps", "launch_scanner", "start_ticket_entry"]) {
      expect(isClientTool(name)).toBe(true);
      expect(JSON.parse(runClientTool(name, { path: "/tickets", kind: "photo" }))).toEqual({
        ok: true,
        execution: "client",
        intent: { name, arguments: { path: "/tickets", kind: "photo" } },
      });
    }
  });
});
