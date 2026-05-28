#!/usr/bin/env node
/**
 * Apply VNDRLY Drizzle schema batches to Supabase via execute_sql (MCP).
 * Run from repo root after Supabase MCP is authenticated in Cursor:
 *
 *   node scripts/apply-supabase-schema.mjs
 *
 * This script prints batch sizes and instructions. The actual apply is
 * performed by the Cursor agent using plugin-supabase-supabase apply_migration
 * because local direct Postgres connections to Supabase may be IPv6-only.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const batchDir = path.join(__dirname, "../lib/db/drizzle/batches");

for (const name of ["combined_a.sql", "combined_b.sql"]) {
  const file = path.join(batchDir, name);
  if (!fs.existsSync(file)) {
    console.error(`Missing ${file}. Regenerate with drizzle-kit generate first.`);
    process.exit(1);
  }
  const sql = fs.readFileSync(file, "utf8");
  console.log(`${name}: ${sql.length} bytes, ${sql.split(";").length} statements (approx)`);
}

console.log("\nApply via Supabase MCP apply_migration:");
console.log("  vndrly_initial_schema_a  <- combined_a.sql");
console.log("  vndrly_initial_schema_b  <- combined_b.sql");
