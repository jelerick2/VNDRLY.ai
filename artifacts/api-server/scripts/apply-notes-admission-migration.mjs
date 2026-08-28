import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import pg from "pg";

import { runNotesAdmissionMigration } from "../../../scripts/notes-admission-migration.mjs";

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required for the notes-admission migration");
}

const migrationPath = fileURLToPath(
  new URL(
    "../../../lib/db/drizzle/chunk_392_site_visit_notes_admission.sql",
    import.meta.url,
  ),
);
const migrationSql = await readFile(migrationPath, "utf8");
const client = new pg.Client({ connectionString: databaseUrl });

try {
  await client.connect();
  await runNotesAdmissionMigration(client, migrationSql);
  process.stdout.write(
    "notes-admission migration/preflight passed: site_visits notes, check_out_notes, and admission_status are nullable text\n",
  );
} finally {
  await client.end().catch(() => undefined);
}
