import { describe, expect, it } from "vitest";

import { extractPlateCandidate } from "./gate-plate-ocr";

describe("extractPlateCandidate", () => {
  it("reads a JSON plate from the model", () => {
    expect(extractPlateCandidate('{"plate":"ok-4412"}')).toBe("OK-4412");
  });

  it("picks an alphanumeric plate out of noisy OCR text", () => {
    expect(extractPlateCandidate("OKLAHOMA\nEXP 12/26\nOK 4412\nUSA")).toBe("OK4412");
  });

  it("returns null when no mixed letter-number tag is present", () => {
    expect(extractPlateCandidate("No license plate is visible.")).toBeNull();
    expect(extractPlateCandidate("2026")).toBeNull();
  });
});

describe("readPlateFromPhoto", () => {
  it("uses the API plate when one is returned", async () => {
    const { readPlateFromPhoto } = await import("./gate-plate-ocr");
    const file = new File(["fake-plate"], "plate.jpg", { type: "image/jpeg" });
    const plate = await readPlateFromPhoto(file, async () => ({ plate: "ok-4412" }));
    expect(plate).toBe("OK-4412");
  });
});
