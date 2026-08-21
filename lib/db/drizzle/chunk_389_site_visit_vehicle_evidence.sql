ALTER TABLE "site_visits"
  ADD COLUMN IF NOT EXISTS "plate_photo_url" text,
  ADD COLUMN IF NOT EXISTS "vehicle_photo_url" text;
