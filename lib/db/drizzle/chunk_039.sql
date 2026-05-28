CREATE TABLE "partner_eula_acceptances" (
	"id" serial PRIMARY KEY NOT NULL,
	"partner_id" integer NOT NULL,
	"vendor_id" integer NOT NULL,
	"vendor_catalog_version_id" integer NOT NULL,
	"accepted_by_user_id" integer NOT NULL,
	"accepted_eula_hash" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"accepted_at" timestamp with time zone DEFAULT now() NOT NULL
);