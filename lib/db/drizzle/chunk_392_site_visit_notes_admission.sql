ALTER TABLE "site_visits" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "site_visits" ADD COLUMN IF NOT EXISTS "check_out_notes" text;
ALTER TABLE "site_visits" ADD COLUMN IF NOT EXISTS "admission_status" text;
