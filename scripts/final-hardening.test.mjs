import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import * as e2eIsolation from "./e2e-isolation.mjs";
import { shouldLoadLocalEnvironment } from "./run-api-local-config.mjs";
import {
  buildApiMigrationAndRestartCommands,
  parsePlateStateMigration,
  runPlateStateMigration,
} from "./plate-state-migration.mjs";

const repoRoot = new URL("../", import.meta.url);
const { assertIsolatedTestDatabaseEnvironment, normalizeDatabaseTarget } =
  e2eIsolation;

test("root test:e2e enters the isolated database wrapper before Playwright", async () => {
  const pkg = JSON.parse(
    await readFile(new URL("package.json", repoRoot), "utf8"),
  );
  const command = pkg.scripts["test:e2e"];

  assert.match(command, /run-with-test-db/);
  assert.match(command, /playwright test/);
  assert.ok(
    command.indexOf("run-with-test-db") < command.indexOf("playwright test"),
    "the isolated wrapper must own the Playwright child process",
  );
});

test("the test database wrapper validates its target before every database operation", async () => {
  const wrapper = await readFile(
    new URL("artifacts/api-server/scripts/run-with-test-db.ts", repoRoot),
    "utf8",
  );
  const resolution = wrapper.indexOf("const resolved = resolveTestDbUrl()");
  const firstDatabaseOperation = wrapper.indexOf(
    "await ensureDatabaseExists(resolved.maintenanceUrl",
  );

  assert.match(
    wrapper,
    /import \{ resolveIsolatedTestDatabaseTarget \} from "\.\.\/\.\.\/\.\.\/scripts\/e2e-isolation\.mjs"/,
  );
  assert.ok(resolution >= 0, "wrapper must resolve the validated target");
  assert.ok(
    firstDatabaseOperation > resolution,
    "target validation must finish before create/reset/connect work begins",
  );
});

test("isolated E2E provenance requires the marker and the same normalized database target", () => {
  const databaseUrl =
    "postgresql://test%20user:password@isolated.example.test:5432/e2e_database_test?sslmode=require";

  assert.throws(
    () =>
      assertIsolatedTestDatabaseEnvironment({
        DATABASE_URL: databaseUrl,
        TEST_DATABASE_URL: databaseUrl,
      }),
    /VNDRLY_ISOLATED_TEST_DB=1/,
  );
  assert.throws(
    () =>
      assertIsolatedTestDatabaseEnvironment({
        DATABASE_URL: databaseUrl,
        TEST_DATABASE_URL:
          "postgresql://test%20user:password@other.example.test:5432/e2e_database_test",
        VNDRLY_ISOLATED_TEST_DB: "1",
      }),
    /same normalized database target/,
  );
  assert.equal(
    assertIsolatedTestDatabaseEnvironment({
      DATABASE_URL: databaseUrl,
      TEST_DATABASE_URL:
        "postgresql://test%20user:different@isolated.example.test/e2e_database_test?application_name=playwright",
      VNDRLY_ISOLATED_TEST_DB: "1",
    }).databaseUrl,
    databaseUrl,
  );

  assert.throws(
    () =>
      assertIsolatedTestDatabaseEnvironment({
        DATABASE_URL: "postgresql://runner:secret@isolated.example.test/vndrly",
        TEST_DATABASE_URL:
          "postgresql://runner:secret@isolated.example.test/vndrly",
        VNDRLY_ISOLATED_TEST_DB: "1",
      }),
    /database name ending in _test/,
  );
});

test("test database resolution rejects shared-looking explicit targets before setup", () => {
  const resolve = e2eIsolation.resolveIsolatedTestDatabaseTarget;
  const shared = "postgresql://runner:secret@db.example.test/vndrly";

  assert.throws(
    () =>
      resolve({
        DATABASE_URL: shared,
        TEST_DATABASE_URL: shared,
      }),
    /distinct from DATABASE_URL/,
  );
  assert.throws(
    () =>
      resolve({
        DATABASE_URL: shared,
        TEST_DATABASE_URL:
          "postgresql://runner:secret@isolated.example.test/vndrly",
      }),
    /database name ending in _test/,
  );
  assert.throws(
    () =>
      resolve({
        DATABASE_URL:
          "postgresql://runner:first@isolated.example.test/vndrly_test?sslmode=require",
        TEST_DATABASE_URL:
          "postgresql://alternate:second@ISOLATED.EXAMPLE.TEST:5432/vndrly_test?application_name=tests",
      }),
    /distinct from DATABASE_URL/,
  );
});

test("test database resolution preserves safe derived and explicit _test targets", () => {
  const resolve = e2eIsolation.resolveIsolatedTestDatabaseTarget;
  const base =
    "postgresql://runner:secret@db.example.test:6543/vndrly?sslmode=require";
  const derived = resolve({ DATABASE_URL: base });

  assert.equal(derived.testDbName, "vndrly_test");
  assert.equal(derived.source, "derived-from-DATABASE_URL");
  assert.equal(new URL(derived.testUrl).hostname, "db.example.test");
  assert.equal(new URL(derived.testUrl).port, "6543");
  assert.equal(new URL(derived.testUrl).username, "runner");
  assert.equal(new URL(derived.testUrl).password, "secret");
  assert.equal(new URL(derived.testUrl).search, "?sslmode=require");

  const explicit = resolve({
    DATABASE_URL: "postgresql://runner:secret@shared.example.test/vndrly_test",
    TEST_DATABASE_URL:
      "postgresql://runner:secret@isolated.example.test/vndrly_test?sslmode=require",
  });
  assert.equal(explicit.testDbName, "vndrly_test");
  assert.equal(explicit.source, "TEST_DATABASE_URL");
  assert.equal(new URL(explicit.testUrl).hostname, "isolated.example.test");
});

test("same _test database name on a different host is a distinct explicit target", () => {
  const resolved = e2eIsolation.resolveIsolatedTestDatabaseTarget({
    DATABASE_URL: "postgresql://runner:secret@shared.example.test/vndrly_test",
    TEST_DATABASE_URL:
      "postgresql://runner:secret@isolated.example.test/vndrly_test",
  });

  assert.equal(resolved.testDbName, "vndrly_test");
  assert.equal(new URL(resolved.testUrl).hostname, "isolated.example.test");
});

test("E2E web requests are pinned to the wrapper-owned localhost server", () => {
  const assertLocal = e2eIsolation.assertLocalE2EBaseUrl;

  assert.equal(assertLocal(undefined), "http://localhost:23539");
  assert.equal(
    assertLocal("http://LOCALHOST:23539/"),
    "http://localhost:23539",
  );

  for (const unsafe of [
    "https://example.com",
    "http://10.0.0.5:23539",
    "http://127.0.0.1:23539",
    "http://localhost:9999",
    "http://localhost:23539/proxy",
  ]) {
    assert.throws(() => assertLocal(unsafe), /fixed local E2E origin/);
  }
});

test("Playwright config and global setup validate the local origin before use", async () => {
  const [config, globalSetup] = await Promise.all([
    readFile(new URL("lib/e2e/playwright.config.ts", repoRoot), "utf8"),
    readFile(new URL("lib/e2e/global-setup.ts", repoRoot), "utf8"),
  ]);

  assert.match(config, /baseURL\s*=\s*assertLocalE2EBaseUrl/);
  assert.doesNotMatch(config, /process\.env\.E2E_BASE_URL\s*\?\?/);
  assert.equal([...config.matchAll(/reuseExistingServer:\s*false/g)].length, 2);
  assert.doesNotMatch(config, /reuseExistingServer:\s*true/);

  const isolationAssertion = globalSetup.indexOf(
    "assertIsolatedTestDatabaseEnvironment(process.env)",
  );
  const localAssertion = globalSetup.indexOf("assertLocalE2EBaseUrl(");
  const seedRequest = globalSetup.indexOf("fetch(");
  assert.ok(
    isolationAssertion >= 0,
    "global setup must validate the isolated database target",
  );
  assert.ok(localAssertion >= 0, "global setup must validate the E2E origin");
  assert.ok(
    seedRequest > isolationAssertion && seedRequest > localAssertion,
    "global setup must validate the database and origin before POST /auth/seed",
  );
});

test("database target normalization ignores credentials and connection options, not physical identity", () => {
  const left = normalizeDatabaseTarget(
    "postgresql://runner:secret@DB.EXAMPLE.test/e2e?sslmode=require",
  );
  const sameTarget = normalizeDatabaseTarget(
    "postgresql://runner:other@db.example.test:5432/e2e?application_name=test",
  );
  const sameTargetOtherUser = normalizeDatabaseTarget(
    "postgresql://different:secret@db.example.test:5432/e2e",
  );
  const otherDatabase = normalizeDatabaseTarget(
    "postgresql://runner:secret@db.example.test:5432/other_test",
  );

  assert.equal(left, sameTarget);
  assert.equal(left, sameTargetOtherUser);
  assert.notEqual(left, otherDatabase);
});

test("the local API launcher never loads .env.local inside the isolated wrapper", () => {
  assert.equal(
    shouldLoadLocalEnvironment({ VNDRLY_ISOLATED_TEST_DB: "1" }),
    false,
  );
  assert.equal(shouldLoadLocalEnvironment({}), true);
});

test("the plate-state migration accepts only the two checked-in additive statements", () => {
  const sql = [
    'ALTER TABLE "guest_sessions" ADD COLUMN IF NOT EXISTS "plate_state" text;',
    'ALTER TABLE "site_visits" ADD COLUMN IF NOT EXISTS "plate_state" text;',
  ].join("\n");

  assert.deepEqual(parsePlateStateMigration(sql), [
    'ALTER TABLE "guest_sessions" ADD COLUMN IF NOT EXISTS "plate_state" text',
    'ALTER TABLE "site_visits" ADD COLUMN IF NOT EXISTS "plate_state" text',
  ]);
  assert.throws(
    () => parsePlateStateMigration(`${sql}\nDROP TABLE site_visits;`),
    /exactly the approved additive plate_state statements/,
  );
});

test("migration execution is idempotent, narrow, and verifies nullable text columns", async () => {
  const queries = [];
  const client = {
    async query(text) {
      queries.push(text);
      if (/information_schema\.columns/.test(text)) {
        return {
          rows: [
            {
              table_name: "guest_sessions",
              data_type: "text",
              is_nullable: "YES",
            },
            {
              table_name: "site_visits",
              data_type: "text",
              is_nullable: "YES",
            },
          ],
        };
      }
      return { rows: [] };
    },
  };

  await runPlateStateMigration(
    client,
    [
      'ALTER TABLE "guest_sessions" ADD COLUMN IF NOT EXISTS "plate_state" text;',
      'ALTER TABLE "site_visits" ADD COLUMN IF NOT EXISTS "plate_state" text;',
    ].join("\n"),
  );

  assert.equal(queries.length, 3);
  assert.match(
    queries[0],
    /^ALTER TABLE "guest_sessions" ADD COLUMN IF NOT EXISTS/,
  );
  assert.match(
    queries[1],
    /^ALTER TABLE "site_visits" ADD COLUMN IF NOT EXISTS/,
  );
  assert.match(queries[2], /information_schema\.columns/);
  assert.doesNotMatch(
    queries.join("\n"),
    /\b(?:DROP|TRUNCATE|DELETE|UPDATE|INSERT)\b/i,
  );
});

test("deployment migrates and verifies before the API restart without blind schema push", () => {
  const commands = buildApiMigrationAndRestartCommands();
  const migration = commands.indexOf("migrate:plate-state");
  const restart = commands.indexOf("systemctl restart vndrly-api");

  assert.ok(migration >= 0, "deployment must invoke the plate-state migration");
  assert.ok(
    restart > migration,
    "restart must happen only after migration succeeds",
  );
  assert.doesNotMatch(commands, /drizzle(?:-kit)?\s+push|DROP|TRUNCATE/i);
});

test("destructive E2E fixture routes are guarded by isolated-database provenance", async () => {
  const authRoutes = await readFile(
    new URL("artifacts/api-server/src/routes/auth.ts", repoRoot),
    "utf8",
  );

  for (const route of [
    "/auth/seed-1099-fixture",
    "/auth/seed-audit-pagination-fixture",
  ]) {
    const escapedRoute = route.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    assert.match(
      authRoutes,
      new RegExp(
        `router\\.post\\(\\s*["']${escapedRoute}["']\\s*,\\s*requireIsolatedFixtureContext\\s*,`,
      ),
      `${route} must reject requests before its destructive database work`,
    );
  }
});
