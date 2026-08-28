import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import pg from "pg";

import { runPlateStateMigration } from "../../../scripts/plate-state-migration.mjs";

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required for the plate_state migration");
}

const migrationPath = fileURLToPath(
  new URL(
    "../../../lib/db/drizzle/chunk_391_site_visit_plate_state.sql",
    import.meta.url,
  ),
);
const migrationSql = await readFile(migrationPath, "utf8");
const client = new pg.Client({ connectionString: databaseUrl });

try {
  await client.connect();
  await runPlateStateMigration(client, migrationSql);
  process.stdout.write(
    "plate_state migration/preflight passed: guest_sessions and site_visits are nullable text\n",
  );
} finally {
  await client.end().catch(() => undefined);
}
