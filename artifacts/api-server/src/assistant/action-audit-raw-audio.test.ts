import { describe, expect, it } from "vitest";
import { excludeRawAudio } from "./action-audit";

describe("AskV audit raw-audio exclusion", () => {
  it("strips audio payloads before they can be stored", () => {
    expect(excludeRawAudio({
      transcriptText: "check in Bob",
      audioBase64: "AAAA",
      wav: "blob",
      nested: { pcm: [1, 2], notes: "ok" },
    })).toEqual({
      transcriptText: "check in Bob",
      nested: { notes: "ok" },
    });
  });
});
