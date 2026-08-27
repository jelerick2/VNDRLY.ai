ALTER TABLE "guest_sessions" ADD COLUMN IF NOT EXISTS "plate_state" text;
ALTER TABLE "site_visits" ADD COLUMN IF NOT EXISTS "plate_state" text;
