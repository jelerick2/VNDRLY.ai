#!/usr/bin/env bash
# Paste entire contents into Replit Shell if scripts/ isn't synced yet.
set -euo pipefail
NEW_DATABASE_URL="${NEW_DATABASE_URL:-${DATABASE_URL:-}}"
[[ -n "$NEW_DATABASE_URL" && "$NEW_DATABASE_URL" == *supabase.co* ]] || { echo "DATABASE_URL must be Supabase"; exit 1; }
OLD="${OLD_DATABASE_URL:-}"
if [[ -z "$OLD" || "$OLD" == *supabase.co* ]]; then
  while IFS= read -r line; do
    n="${line%%=*}"; v="${line#*=}"
    [[ "$v" == postgresql://* && "$v" != *supabase.co* ]] && OLD="$v" && break
  done < <(printenv)
fi
if [[ -z "$OLD" && -n "${PGHOST:-}" && -n "${PGPASSWORD:-}" ]]; then
  OLD="postgresql://${PGUSER:-postgres}:${PGPASSWORD}@${PGHOST}:${PGPORT:-5432}/${PGDATABASE:-postgres}"
fi
[[ -n "$OLD" ]] || { echo "No old DB found. Add OLD_DATABASE_URL secret from Database Settings."; exit 1; }
echo "Source: $(echo "$OLD" | sed 's/:\/\/[^:]*:[^@]*@/://***@/')"
echo "Target: $(echo "$NEW_DATABASE_URL" | sed 's/:\/\/[^:]*:[^@]*@/://***@/')"
psql "$OLD" -c "SELECT COUNT(*) AS site_locations FROM site_locations;" || true
DUMP="/tmp/vndrly_prod_data.sql"
pg_dump "$OLD" --data-only --no-owner --no-privileges -f "$DUMP"
psql "$NEW_DATABASE_URL" -c "SET session_replication_role = replica;"
psql "$NEW_DATABASE_URL" -f "$DUMP"
psql "$NEW_DATABASE_URL" -c "SET session_replication_role = DEFAULT;"
psql "$NEW_DATABASE_URL" -c "SELECT COUNT(*) AS site_locations FROM site_locations;"
