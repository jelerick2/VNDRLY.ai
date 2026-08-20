import { describe, expect, it } from "vitest";
import { type SQL } from "drizzle-orm";
import { clampAcosArg, gpsHaversineKmSql } from "./analytics-gps";

function flattenSql(fragment: SQL): string {
  const chunks = (fragment as { queryChunks?: unknown[] }).queryChunks ?? [];
  return chunks
    .map((chunk) => {
      if (typeof chunk === "string") return chunk;
      if (!chunk || typeof chunk !== "object") return "";
      if ("queryChunks" in chunk) return flattenSql(chunk as SQL);
      if ("value" in chunk) {
        const value = (chunk as { value: unknown }).value;
        if (typeof value === "string") return value;
        if (Array.isArray(value)) return value.map((part) => String(part)).join("");
      }
      return "";
    })
    .join("");
}

describe("clampAcosArg", () => {
  it("clamps the acos domain to [-1, 1]", () => {
    expect(clampAcosArg(-1.5)).toBe(-1);
    expect(clampAcosArg(-1)).toBe(-1);
    expect(clampAcosArg(0)).toBe(0);
    expect(clampAcosArg(0.42)).toBe(0.42);
    expect(clampAcosArg(1)).toBe(1);
    expect(clampAcosArg(1.0001)).toBe(1);
    expect(clampAcosArg(8)).toBe(1);
  });
});

describe("gpsHaversineKmSql", () => {
  it("wraps acos input in a Postgres clamp to [-1, 1]", () => {
    const text = flattenSql(gpsHaversineKmSql());
    expect(text).toContain("acos(");
    expect(text).toContain("LEAST(1::float8, GREATEST(-1::float8");
  });
});
