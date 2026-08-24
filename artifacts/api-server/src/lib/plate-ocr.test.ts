import { describe, expect, it } from "vitest";

import { extractPlateCandidate } from "./plate-ocr";

describe("extractPlateCandidate", () => {
  it("reads a JSON plate from the model", () => {
    expect(extractPlateCandidate('{"plate":"ok-4412"}')).toBe("OK-4412");
    expect(extractPlateCandidate("```json\n{\"plate\":\"TX8801\"}\n```")).toBe("TX8801");
  });

  it("returns null when the model saw no plate", () => {
    expect(extractPlateCandidate('{"plate":null}')).toBeNull();
    expect(extractPlateCandidate("No license plate is visible.")).toBeNull();
  });

  it("picks an alphanumeric plate out of noisy OCR text", () => {
    expect(
      extractPlateCandidate("OKLAHOMA\nEXP 12/26\nOK 4412\nUSA"),
    ).toBe("OK4412");
  });

  it("accepts mixed and personalized single-class plates while rejecting years", () => {
    expect(extractPlateCandidate("plate: abc-1234")).toBe("ABC-1234");
    expect(extractPlateCandidate('{"plate":"COWBOY"}')).toBe("COWBOY");
    expect(extractPlateCandidate('{"plate":"77777"}')).toBe("77777");
    expect(extractPlateCandidate("2026")).toBeNull();
  });
});
