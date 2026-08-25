ALTER TABLE "site_visits"
  ADD COLUMN IF NOT EXISTS "recorded_by_user_id" integer;
