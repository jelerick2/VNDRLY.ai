CREATE TABLE "vendor_site_location_afes" (
	"id" serial PRIMARY KEY NOT NULL,
	"vendor_id" integer NOT NULL,
	"site_location_id" integer NOT NULL,
	"afe" text NOT NULL
);