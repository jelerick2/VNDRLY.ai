import type { FullConfig } from "@playwright/test";
import { assertIsolatedTestDatabaseEnvironment } from "../../scripts/e2e-isolation.mjs";

// Isolated-only safety net: hit POST /api/auth/seed before any spec so the
// fixed values in docs/canonical-credentials.md are applied verbatim inside
// the wrapper-owned test database. The provenance assertion runs before the
// request and fixture routes independently enforce the same child-only marker.
// A seed failure aborts the suite rather than allowing misleading login errors.
//
export default async function globalSetup(_config: FullConfig): Promise<void> {
  assertIsolatedTestDatabaseEnvironment(process.env);
  const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:23539";
  const seedURL = `${baseURL.replace(/\/$/, "")}/api/auth/seed`;
  const res = await fetch(seedURL, { method: "POST" });
  if (!res.ok) {
    throw new Error(
      `[e2e global-setup] POST /api/auth/seed -> ${res.status} ${res.statusText}; refusing to run with unverified canonical demo credentials`,
    );
  }
  // eslint-disable-next-line no-console
  console.log(
    "[e2e global-setup] isolated seed ok — canonical demo credentials applied",
  );
}
