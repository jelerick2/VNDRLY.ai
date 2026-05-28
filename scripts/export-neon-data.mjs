#!/usr/bin/env node
/**
 * Export data-only INSERT SQL from Neon to stdout/files for Supabase import.
 * Usage: node scripts/export-neon-data.mjs [outDir]
 */
import pg from "pg";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(process.argv[2] || path.join(__dirname, "../.local/neon-export"));
const OLD =
  process.env.OLD_DATABASE_URL ||
  "postgresql://neondb_owner:npg_zMm2FLB6eEDZ@ep-old-brook-a59c3zpv.us-east-2.aws.neon.tech/neondb?sslmode=require";

fs.mkdirSync(outDir, { recursive: true });

function sqlLiteral(val) {
  if (val === null || val === undefined) return "NULL";
  if (typeof val === "boolean") return val ? "TRUE" : "FALSE";
  if (typeof val === "number") return String(val);
  if (val instanceof Date) return `'${val.toISOString()}'`;
  if (Array.isArray(val)) {
    if (val.length === 0) return "'{}'";
    const inner = val.map((v) => (v === null ? "NULL" : `"${String(v).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`)).join(",");
    return `'${inner.replace(/'/g, "''")}'::text[]`;
  }
  if (typeof val === "object") return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
  return `'${String(val).replace(/'/g, "''")}'`;
}

async function main() {
  const client = new pg.Client({
    connectionString: OLD,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  const { rows: tables } = await client.query(`
    SELECT c.relname AS table_name, c.reltuples::bigint AS est_rows
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
    ORDER BY c.relname
  `);

  const summary = [];
  let batch = 0;
  let batchSql = "SET session_replication_role = replica;\n";
  let batchSize = 0;

  const flush = () => {
    if (batchSql.trim().length > 30) {
      batchSql += "SET session_replication_role = DEFAULT;\n";
      fs.writeFileSync(path.join(outDir, `batch_${String(batch).padStart(3, "0")}.sql`), batchSql);
      batch++;
      batchSql = "SET session_replication_role = replica;\n";
      batchSize = 0;
    }
  };

  for (const { table_name } of tables) {
    const countRes = await client.query(`SELECT COUNT(*)::int AS n FROM "${table_name}"`);
    const n = countRes.rows[0].n;
    if (n === 0) continue;

    const data = await client.query(`SELECT * FROM "${table_name}"`);
    const cols = data.fields.map((f) => `"${f.name}"`).join(", ");
    summary.push({ table: table_name, rows: n });

    for (const row of data.rows) {
      const vals = data.fields.map((f) => sqlLiteral(row[f.name])).join(", ");
      batchSql += `INSERT INTO "${table_name}" (${cols}) VALUES (${vals});\n`;
      batchSize++;
      if (batchSize >= 200) flush();
    }
    flush();
  }
  flush();

  fs.writeFileSync(path.join(outDir, "summary.json"), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify({ outDir, tables: summary.length, totalRows: summary.reduce((a, t) => a + t.rows, 0), batches: batch }, null, 2));
  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
