#!/usr/bin/env node
/**
 * Applies all VNDRLY schema batches via Supabase execute_sql (Management API).
 * Requires SUPABASE_ACCESS_TOKEN env var (personal access token from supabase.com/dashboard/account/tokens).
 *
 * Usage:
 *   set SUPABASE_ACCESS_TOKEN=sbp_...
 *   node scripts/apply-supabase-batches-loop.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const batchDir = path.join(__dirname, "../lib/db/drizzle/batches");
const projectRef = "bihjmgbdzbhcnsuhzzwo";
const token = process.env.SUPABASE_ACCESS_TOKEN;

if (!token) {
  console.error(
    "Set SUPABASE_ACCESS_TOKEN (https://supabase.com/dashboard/account/tokens)",
  );
  process.exit(1);
}

async function runQuery(sql, label) {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: sql }),
    },
  );
  const body = await res.text();
  if (!res.ok) {
    throw new Error(`${label} failed (${res.status}): ${body.slice(0, 500)}`);
  }
  console.log(`OK ${label} (${sql.length} bytes)`);
  return body;
}

for (let i = 0; i < 10; i++) {
  const file = path.join(batchDir, `apply_${i}.sql`);
  const sql = fs.readFileSync(file, "utf8");
  await runQuery(sql, `batch_${i}`);
}

const combinedB = path.join(batchDir, "combined_b.sql");
if (fs.existsSync(combinedB)) {
  await runQuery(fs.readFileSync(combinedB, "utf8"), "combined_b");
}

console.log("All batches applied.");
