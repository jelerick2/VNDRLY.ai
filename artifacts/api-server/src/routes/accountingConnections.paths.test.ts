import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SOURCE = readFileSync(
  join(import.meta.dirname, "accountingConnections.ts"),
  "utf8",
);

const ROUTER_PATHS = [
  ...SOURCE.matchAll(/router\.(get|post|put|patch|delete)\(\s*"([^"]+)"/g),
].map((match) => match[2]);

describe("accounting connection router paths", () => {
  it("registers every path under /accounting/ and never under /api/", () => {
    expect(ROUTER_PATHS.length).toBeGreaterThan(0);
    for (const path of ROUTER_PATHS) {
      expect(path.startsWith("/accounting/"), path).toBe(true);
      expect(path.startsWith("/api/"), path).toBe(false);
    }
  });
});
