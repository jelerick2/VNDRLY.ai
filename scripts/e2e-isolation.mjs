export const LOCAL_E2E_BASE_URL = "http://localhost:23539";

const TARGET_CHANGING_POSTGRES_QUERY_PARAMETERS = new Set([
  "host",
  "hostaddr",
  "port",
  "dbname",
  "database",
  "user",
  "username",
  "password",
  "service",
  "servicefile",
]);

const ALLOWED_POSTGRES_QUERY_PARAMETERS = new Set([
  "sslmode",
  "application_name",
]);

function assertSafePostgresUrlOptions(url) {
  if (url.href.includes("#")) {
    throw new Error(
      "PostgreSQL URL fragments are forbidden for isolated test database targets",
    );
  }

  for (const [rawName] of url.searchParams) {
    const name = rawName.toLowerCase();
    if (TARGET_CHANGING_POSTGRES_QUERY_PARAMETERS.has(name)) {
      throw new Error(
        `Refusing target-changing PostgreSQL URL query parameter "${rawName}"`,
      );
    }
    if (!ALLOWED_POSTGRES_QUERY_PARAMETERS.has(name)) {
      throw new Error(
        `Refusing unsupported PostgreSQL URL query parameter "${rawName}"; only sslmode and application_name are allowed`,
      );
    }
  }
}

function parsePostgresUrl(rawUrl) {
  if (typeof rawUrl !== "string" || !rawUrl.trim()) {
    throw new Error("DATABASE_URL and TEST_DATABASE_URL must both be set");
  }
  const url = new URL(rawUrl.trim());
  const protocol = url.protocol.toLowerCase();
  if (protocol !== "postgres:" && protocol !== "postgresql:") {
    throw new Error("E2E database URLs must use postgres or postgresql");
  }
  assertSafePostgresUrlOptions(url);
  return url;
}

function databaseName(url) {
  return decodeURIComponent(url.pathname).replace(/^\/+/, "");
}

function assertTestDatabaseName(rawUrl, label) {
  const name = databaseName(parsePostgresUrl(rawUrl));
  if (!name.endsWith("_test")) {
    throw new Error(
      `${label} must identify a database name ending in _test; refusing a shared-looking target`,
    );
  }
  return name;
}

function resolveListenNotifyTestUrl(rawUrl, testDbName) {
  if (!rawUrl) return undefined;
  const url = parsePostgresUrl(rawUrl);
  url.pathname = `/${testDbName}`;
  return url.toString();
}

export function normalizeDatabaseTarget(rawUrl) {
  const url = parsePostgresUrl(rawUrl);
  return JSON.stringify({
    protocol: "postgresql:",
    hostname: url.hostname.toLowerCase().replace(/\.$/, ""),
    port: url.port || "5432",
    database: databaseName(url),
  });
}

/**
 * Resolve and validate the target before run-with-test-db performs any
 * connection, CREATE DATABASE, schema reset, or migration work.
 */
export function resolveIsolatedTestDatabaseTarget(env) {
  const explicit = env.TEST_DATABASE_URL?.trim();
  const base = env.DATABASE_URL?.trim();

  if (!explicit && !base) {
    throw new Error(
      "Neither TEST_DATABASE_URL nor DATABASE_URL is set; cannot bootstrap an isolated test database.",
    );
  }

  if (!explicit && base.includes("test:test@localhost")) {
    throw new Error(
      "DATABASE_URL points at the offline placeholder (test:test@localhost). Set TEST_DATABASE_URL or a real DATABASE_URL to run integration tests.",
    );
  }

  if (
    explicit &&
    base &&
    normalizeDatabaseTarget(explicit) === normalizeDatabaseTarget(base)
  ) {
    throw new Error(
      "TEST_DATABASE_URL must identify a normalized target distinct from DATABASE_URL before the isolated wrapper rewrites DATABASE_URL",
    );
  }

  const url = parsePostgresUrl(explicit ?? base);
  if (explicit) {
    assertTestDatabaseName(explicit, "TEST_DATABASE_URL");
  } else {
    const baseName = databaseName(url) || "postgres";
    if (!baseName.endsWith("_test")) {
      url.pathname = `/${baseName}_test`;
    }
  }

  const testUrl = url.toString();
  const testDbName = assertTestDatabaseName(testUrl, "Resolved test database");
  const maintenance = new URL(testUrl);
  maintenance.pathname = "/postgres";
  const listenNotifyTestUrl = resolveListenNotifyTestUrl(
    env.LISTEN_NOTIFY_DATABASE_URL?.trim(),
    testDbName,
  );

  return {
    testUrl,
    maintenanceUrl: maintenance.toString(),
    testDbName,
    listenNotifyTestUrl,
    source: explicit ? "TEST_DATABASE_URL" : "derived-from-DATABASE_URL",
  };
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
  assertTestDatabaseName(testDatabaseUrl, "Isolated E2E target");
  return { databaseUrl, testDatabaseUrl };
}

export function assertLocalE2EBaseUrl(rawUrl) {
  const candidate = rawUrl === undefined ? LOCAL_E2E_BASE_URL : rawUrl.trim();
  let url;
  try {
    url = new URL(candidate);
  } catch {
    throw new Error(
      `E2E_BASE_URL must use the fixed local E2E origin ${LOCAL_E2E_BASE_URL}`,
    );
  }

  const isCanonicalLocalOrigin =
    url.protocol === "http:" &&
    url.hostname.toLowerCase() === "localhost" &&
    url.port === "23539" &&
    url.username === "" &&
    url.password === "" &&
    url.pathname === "/" &&
    url.search === "" &&
    url.hash === "";

  if (!isCanonicalLocalOrigin) {
    throw new Error(
      `E2E_BASE_URL must use the fixed local E2E origin ${LOCAL_E2E_BASE_URL}; external and alternate local targets are forbidden`,
    );
  }

  return LOCAL_E2E_BASE_URL;
}
