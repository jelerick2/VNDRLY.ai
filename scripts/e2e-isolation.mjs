export function normalizeDatabaseTarget(rawUrl) {
  if (typeof rawUrl !== "string" || !rawUrl.trim()) {
    throw new Error("DATABASE_URL and TEST_DATABASE_URL must both be set");
  }
  const url = new URL(rawUrl.trim());
  const protocol = url.protocol.toLowerCase();
  if (protocol !== "postgres:" && protocol !== "postgresql:") {
    throw new Error("E2E database URLs must use postgres or postgresql");
  }
  return JSON.stringify({
    protocol: "postgresql:",
    hostname: url.hostname.toLowerCase(),
    port: url.port || "5432",
    username: decodeURIComponent(url.username),
    database: decodeURIComponent(url.pathname).replace(/^\/+/, ""),
  });
}

export function assertIsolatedTestDatabaseEnvironment(env) {
  if (env.VNDRLY_ISOLATED_TEST_DB !== "1") {
    throw new Error(
      "Refusing E2E execution without VNDRLY_ISOLATED_TEST_DB=1 from the isolated test database wrapper",
    );
  }
  const databaseUrl = env.DATABASE_URL?.trim();
  const testDatabaseUrl = env.TEST_DATABASE_URL?.trim();
  if (!databaseUrl || !testDatabaseUrl) {
    throw new Error(
      "Refusing E2E execution unless DATABASE_URL and TEST_DATABASE_URL are both set",
    );
  }
  if (
    normalizeDatabaseTarget(databaseUrl) !==
    normalizeDatabaseTarget(testDatabaseUrl)
  ) {
    throw new Error(
      "Refusing E2E execution unless DATABASE_URL and TEST_DATABASE_URL identify the same normalized database target",
    );
  }
  return { databaseUrl, testDatabaseUrl };
}
