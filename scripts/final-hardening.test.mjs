import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  assertIsolatedTestDatabaseEnvironment,
  normalizeDatabaseTarget,
} from "./e2e-isolation.mjs";
import { shouldLoadLocalEnvironment } from "./run-api-local-config.mjs";
import {
  buildApiMigrationAndRestartCommands,
  parsePlateStateMigration,
  runPlateStateMigration,
} from "./plate-state-migration.mjs";

const repoRoot = new URL("../", import.meta.url);

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

test("isolated E2E provenance requires the marker and the same normalized database target", () => {
  const databaseUrl =
    "postgresql://test%20user:password@isolated.example.test:5432/e2e_database?sslmode=require";

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
          "postgresql://test%20user:password@other.example.test:5432/e2e_database",
        VNDRLY_ISOLATED_TEST_DB: "1",
      }),
    /same normalized database target/,
  );
  assert.equal(
    assertIsolatedTestDatabaseEnvironment({
      DATABASE_URL: databaseUrl,
      TEST_DATABASE_URL:
        "postgresql://test%20user:different@isolated.example.test/e2e_database?application_name=playwright",
      VNDRLY_ISOLATED_TEST_DB: "1",
    }).databaseUrl,
    databaseUrl,
  );
});

test("database target normalization ignores secrets and connection options, not identity", () => {
  const left = normalizeDatabaseTarget(
    "postgresql://runner:secret@DB.EXAMPLE.test/e2e?sslmode=require",
  );
  const sameTarget = normalizeDatabaseTarget(
    "postgresql://runner:other@db.example.test:5432/e2e?application_name=test",
  );
  const otherUser = normalizeDatabaseTarget(
    "postgresql://different:secret@db.example.test:5432/e2e",
  );

  assert.equal(left, sameTarget);
  assert.notEqual(left, otherUser);
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
