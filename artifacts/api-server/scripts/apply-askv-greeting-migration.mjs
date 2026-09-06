import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import pg from "pg";

import { runAskVGreetingMigration } from "../../../scripts/askv-greeting-migration.mjs";

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required for the AskV greeting migration");
}

const migrationPath = fileURLToPath(
  new URL(
    "../../../lib/db/drizzle/chunk_393_askv_last_full_greeting.sql",
    import.meta.url,
  ),
);
const migrationSql = await readFile(migrationPath, "utf8");
const client = new pg.Client({ connectionString: databaseUrl });

try {
  await client.connect();
  await runAskVGreetingMigration(client, migrationSql);
  process.stdout.write("askv_last_full_greeting_on migration passed\n");
} finally {
  await client.end().catch(() => undefined);
}
