#!/usr/bin/env bash
# Run ONCE in Replit Shell — discovers old DB and copies data to Supabase.
# No manual OLD_DATABASE_URL needed if Replit still exposes a non-Supabase URL.
#
#   bash scripts/replit-one-shot-migrate.sh

set -euo pipefail

NEW_DATABASE_URL="${NEW_DATABASE_URL:-${DATABASE_URL:-}}"
if [[ -z "${NEW_DATABASE_URL}" || "${NEW_DATABASE_URL}" != *"supabase.co"* ]]; then
  echo "ERROR: Set Secrets DATABASE_URL to your Supabase URL first." >&2
  exit 1
fi

discover_old_url() {
  local name val
  if [[ -n "${OLD_DATABASE_URL:-}" && "${OLD_DATABASE_URL}" != *"supabase.co"* ]]; then
    echo "$OLD_DATABASE_URL"
    return 0
  fi
  while IFS= read -r line; do
    name="${line%%=*}"
    val="${line#*=}"
    [[ "$val" == postgresql://* ]] || continue
    [[ "$val" == *"supabase.co"* ]] && continue
    echo "Found candidate env: $name" >&2
    echo "$val"
    return 0
  done < <(printenv | grep -E '^(OLD_DATABASE_URL|NEON_DATABASE_URL|REPLIT_.*DATABASE|HELIUM.*|PRODUCTION_DATABASE_URL)=' || true)

  # Replit Database tool often injects these before Secrets override (legacy Neon)
  if [[ -n "${PGHOST:-}" && -n "${PGPASSWORD:-}" ]]; then
    local user="${PGUSER:-postgres}"
    local db="${PGDATABASE:-postgres}"
    local port="${PGPORT:-5432}"
    echo "postgresql://${user}:${PGPASSWORD}@${PGHOST}:${port}/${db}"
    return 0
  fi

  return 1
}

echo "=== VNDRLY one-shot migration ==="
echo "Target: Supabase ($(echo "$NEW_DATABASE_URL" | sed 's/:\/\/[^:]*:[^@]*@/://***@/'))"

if ! OLD=$(discover_old_url); then
  cat >&2 <<'EOF'

Could not auto-discover the old Replit database URL.

Run this in Shell and paste the output back to Cursor:
  printenv | grep -iE 'DATABASE|PGHOST|PGPORT|PGUSER|PGPASSWORD|PGDATABASE|NEON|HELIUM' | sed 's/=.*password.*/=***REDACTED***/i'

Or add ONE secret manually (only if auto-discovery fails):
  NAME:  OLD_DATABASE_URL
  VALUE: (Replit Database → Development OR Production → Settings gear → copy Connection string)

Then re-run:  bash scripts/replit-one-shot-migrate.sh
EOF
  exit 1
fi

export OLD_DATABASE_URL="$OLD"
export NEW_DATABASE_URL
echo "Source: $(echo "$OLD_DATABASE_URL" | sed 's/:\/\/[^:]*:[^@]*@/://***@/')"

exec bash "$(dirname "$0")/migrate-replit-to-supabase.sh"
