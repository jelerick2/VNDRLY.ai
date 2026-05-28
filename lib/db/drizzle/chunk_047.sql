CREATE TABLE "site_work_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_location_id" integer NOT NULL,
	"work_type_id" integer NOT NULL,
	"vendor_id" integer NOT NULL,
	"afe" text
);