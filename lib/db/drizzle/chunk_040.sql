CREATE TABLE "partner_vendor_approval_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"partner_id" integer NOT NULL,
	"vendor_id" integer NOT NULL,
	"from_status" text,
	"to_status" text NOT NULL,
	"reason" text NOT NULL,
	"reason_detail" jsonb,
	"vendor_catalog_version_id" integer,
	"actor_user_id" integer,
	"actor_role" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);