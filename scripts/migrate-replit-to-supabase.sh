#!/usr/bin/env bash
# One-time copy: Replit/Helium/Neon Postgres → Supabase.
# Run in the Replit Shell (must reach BOTH databases).
#
# Usage (recommended — auto-detects source if saved in Secrets):
#   bash scripts/migrate-replit-to-supabase.sh
#
# Or set explicitly:
#   export OLD_DATABASE_URL='postgresql://...replit or neon...'
#   export NEW_DATABASE_URL='postgresql://postgres:...@db.bihjmgbdzbhcnsuhzzwo.supabase.co:5432/postgres'
#   bash scripts/migrate-replit-to-supabase.sh

set -euo pipefail

NEW_DATABASE_URL="${NEW_DATABASE_URL:-${DATABASE_URL:-}}"

if [[ -z "${NEW_DATABASE_URL:-}" ]]; then
  echo "Set NEW_DATABASE_URL or DATABASE_URL (Supabase) in Secrets." >&2
  exit 1
fi

if [[ "${NEW_DATABASE_URL}" != *"supabase.co"* ]]; then
  echo "DATABASE_URL does not look like Supabase. Set NEW_DATABASE_URL to your Supabase URL." >&2
  exit 1
fi

# Source DB: explicit OLD_DATABASE_URL, or common Replit fallbacks after Neon→Helium upgrade.
if [[ -z "${OLD_DATABASE_URL:-}" ]]; then
  for candidate in \
    "${NEON_DATABASE_URL:-}" \
    "${REPLIT_DB_URL:-}" \
    "${HELIUM_DATABASE_URL:-}" \
    "${PRODUCTION_DATABASE_URL:-}"; do
    if [[ -n "${candidate}" && "${candidate}" != *"supabase.co"* ]]; then
      OLD_DATABASE_URL="${candidate}"
      echo "Using source from saved Replit secret/env (non-Supabase URL)."
      break
    fi
  done
fi

if [[ -z "${OLD_DATABASE_URL:-}" ]]; then
  cat >&2 <<'EOF'
Could not find OLD_DATABASE_URL automatically.

Your live data is still on Replit's database. Before overwriting Secrets,
Replit often saves the previous connection as NEON_DATABASE_URL.

In Replit → Secrets, add or find one of:
  NEON_DATABASE_URL   (legacy Neon / pre-Supabase URL)
  OLD_DATABASE_URL    (paste the Replit Database → Production connection string)

Or in Replit → Database → Production tab, copy the connection string and run:
  export OLD_DATABASE_URL='postgresql://...'
  export NEW_DATABASE_URL='postgresql://postgres:...@db.bihjmgbdzbhcnsuhzzwo.supabase.co:5432/postgres'
  bash scripts/migrate-replit-to-supabase.sh
EOF
  exit 1
fi

if [[ "${OLD_DATABASE_URL}" == "${NEW_DATABASE_URL}" ]]; then
  echo "OLD and NEW URLs are identical — nothing to migrate." >&2
  exit 1
fi

echo "Source (masked): ${OLD_DATABASE_URL/@*/@***}"
echo "Target (masked): ${NEW_DATABASE_URL/@*/@***}"

echo "Checking source row counts..."
psql "$OLD_DATABASE_URL" -v ON_ERROR_STOP=1 -c \
  "SELECT 'users' AS tbl, COUNT(*)::int AS n FROM users
   UNION ALL SELECT 'site_locations', COUNT(*)::int FROM site_locations
   UNION ALL SELECT 'tickets', COUNT(*)::int FROM tickets;"

DUMP="/tmp/vndrly_prod_data.sql"
echo "Dumping data-only from source..."
pg_dump "$OLD_DATABASE_URL" \
  --data-only \
  --no-owner \
  --no-privileges \
  --exclude-table-data='drizzle.__drizzle_migrations' \
  -f "$DUMP"

if [[ "${FORCE:-}" != "1" ]]; then
  ROWS=$(psql "$NEW_DATABASE_URL" -tAc \
    "SELECT COALESCE(SUM(n_live_tup),0)::int FROM pg_stat_user_tables" 2>/dev/null || echo "0")
  if [[ "${ROWS:-0}" != "0" ]]; then
    echo "Target has ${ROWS} rows. Set FORCE=1 to import anyway." >&2
    exit 1
  fi
fi

echo "Restoring into Supabase (FK checks deferred)..."
psql "$NEW_DATABASE_URL" -v ON_ERROR_STOP=1 -c "SET session_replication_role = replica;"
psql "$NEW_DATABASE_URL" -v ON_ERROR_STOP=1 -f "$DUMP"
psql "$NEW_DATABASE_URL" -v ON_ERROR_STOP=1 -c "SET session_replication_role = DEFAULT;"

echo "Verifying target..."
psql "$NEW_DATABASE_URL" -v ON_ERROR_STOP=1 -c \
  "SELECT 'users' AS tbl, COUNT(*)::int AS n FROM users
   UNION ALL SELECT 'site_locations', COUNT(*)::int FROM site_locations
   UNION ALL SELECT 'tickets', COUNT(*)::int FROM tickets;"

echo "Migration complete. Republish vndrly.ai if needed."
