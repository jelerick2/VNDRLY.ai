import { describe, expect, it } from "vitest";

import { extractPlateCandidate } from "./plate-ocr";

describe("extractPlateCandidate", () => {
  it("returns a normalized structured model candidate", () => {
    expect(
      extractPlateCandidate(
        '{"plate":"abc123","state":"Texas","plateConfidence":0.92,"stateConfidence":0.84}',
      ),
    ).toEqual({
      plate: "ABC123",
      state: "TX",
      plateConfidence: 0.92,
      stateConfidence: 0.84,
    });
  });

  it("keeps the legacy JSON plate shape", () => {
    expect(extractPlateCandidate('{"plate":"ok-4412"}')).toEqual({
      plate: "OK-4412",
      state: null,
      plateConfidence: null,
      stateConfidence: null,
    });
    expect(extractPlateCandidate('```json\n{"plate":"TX8801"}\n```')).toEqual({
      plate: "TX8801",
      state: null,
      plateConfidence: null,
      stateConfidence: null,
    });
  });

  it("rejects an invalid OCR state", () => {
    expect(
      extractPlateCandidate(
        '{"plate":"ABC123","state":"ZZ","stateConfidence":0.99}',
      ).state,
    ).toBeNull();
  });

  it("withholds states below the OCR confidence threshold", () => {
    expect(
      extractPlateCandidate(
        '{"plate":"ABC123","state":"TX","stateConfidence":0.79}',
      ),
    ).toMatchObject({ state: null, stateConfidence: 0.79 });
  });

  it("clamps finite OCR confidence values", () => {
    expect(
      extractPlateCandidate(
        '{"plate":"ABC123","state":"TX","plateConfidence":1.4,"stateConfidence":-0.2}',
      ),
    ).toMatchObject({ plateConfidence: 1, stateConfidence: 0 });
  });

  it("returns null confidence for missing or invalid values", () => {
    expect(
      extractPlateCandidate(
        '{"plate":"ABC123","state":"TX","plateConfidence":"high","stateConfidence":null}',
      ),
    ).toMatchObject({ plateConfidence: null, stateConfidence: null });
  });

  it("returns null when the model saw no plate", () => {
    expect(extractPlateCandidate('{"plate":null}')).toEqual({
      plate: null,
      state: null,
      plateConfidence: null,
      stateConfidence: null,
    });
    expect(extractPlateCandidate("No license plate is visible.")).toEqual({
      plate: null,
      state: null,
      plateConfidence: null,
      stateConfidence: null,
    });
  });

  it("returns all null fields for malformed model content", () => {
    expect(extractPlateCandidate('{"plate":')).toEqual({
      plate: null,
      state: null,
      plateConfidence: null,
      stateConfidence: null,
    });
    expect(extractPlateCandidate('{"plate":"ABC123"')).toEqual({
      plate: null,
      state: null,
      plateConfidence: null,
      stateConfidence: null,
    });
  });

  it("returns all null fields for JSON values without a plate field", () => {
    for (const content of [
      '{"state":"TX","stateConfidence":0.99}',
      '["ABC123"]',
      '"ABC123"',
      "123",
    ]) {
      expect(extractPlateCandidate(content)).toEqual({
        plate: null,
        state: null,
        plateConfidence: null,
        stateConfidence: null,
      });
    }
  });

  it("picks an alphanumeric plate out of noisy OCR text", () => {
    expect(
      extractPlateCandidate("OKLAHOMA\nEXP 12/26\nOK 4412\nUSA"),
    ).toMatchObject({ plate: "OK4412" });
  });

  it("accepts mixed and personalized single-class plates while rejecting years", () => {
    expect(extractPlateCandidate("plate: abc-1234")).toMatchObject({
      plate: "ABC-1234",
    });
    expect(extractPlateCandidate('{"plate":"COWBOY"}')).toMatchObject({
      plate: "COWBOY",
    });
    expect(extractPlateCandidate('{"plate":"77777"}')).toMatchObject({
      plate: "77777",
    });
    expect(extractPlateCandidate("2026")).toMatchObject({ plate: null });
  });
});
