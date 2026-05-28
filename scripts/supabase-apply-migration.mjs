#!/usr/bin/env node
/**
 * Reads a SQL file and prints JSON args for Supabase apply_migration.
 * Usage: node scripts/supabase-apply-migration.mjs <sql-file> <migration-name>
 */
import fs from "node:fs";

const [sqlFile, migrationName] = process.argv.slice(2);
if (!sqlFile || !migrationName) {
  console.error("Usage: node scripts/supabase-apply-migration.mjs <sql-file> <migration-name>");
  process.exit(1);
}

const query = fs.readFileSync(sqlFile, "utf8");
const payload = {
  project_id: "bihjmgbdzbhcnsuhzzwo",
  name: migrationName,
  query,
};
process.stdout.write(JSON.stringify(payload));
