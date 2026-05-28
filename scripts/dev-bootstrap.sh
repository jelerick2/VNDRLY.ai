#!/bin/bash
# Sync the local workspace to the currently-checked-out code.
#
# Run this after `git pull` or switching branches. Pushes Drizzle schema
# changes to Supabase (via DATABASE_URL in .env.local).
# The post-merge hook (`scripts/post-merge.sh`) does the same thing
# automatically when a task is merged; this script is the manual
# equivalent for plain `git pull` / branch switches.
#
# Steps:
#   1. Reinstall workspace deps from the lockfile.
#   2. Force-push the Drizzle schema to Supabase (non-interactive,
#      data-loss prompts auto-accepted — use only when you intend schema sync).
#   3. Verify with the schema-drift check so the script exits non-zero
#      if anything is still out of sync.
set -e

pnpm install --frozen-lockfile
yes "" | pnpm --filter @workspace/db run push-force
pnpm --filter @workspace/db run check-schema
