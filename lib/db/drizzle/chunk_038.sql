CREATE TABLE "vendor_catalog_versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"vendor_id" integer NOT NULL,
	"version" integer NOT NULL,
	"published_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_by_user_id" integer,
	"change_summary" text,
	"rates_snapshot" jsonb NOT NULL,
	"work_types_snapshot" jsonb NOT NULL,
	"compliance_snapshot" jsonb NOT NULL,
	"eula_text" text NOT NULL,
	"eula_hash" text
);