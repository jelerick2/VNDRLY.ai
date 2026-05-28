CREATE TABLE "partner_vendor_relationships" (
	"id" serial PRIMARY KEY NOT NULL,
	"partner_id" integer NOT NULL,
	"vendor_id" integer NOT NULL,
	"status" text NOT NULL,
	"notes" text,
	"rated_at" timestamp with time zone,
	"approved_at" timestamp with time zone,
	"approved_by_user_id" integer,
	"approved_catalog_version_id" integer,
	"last_status_reason" text,
	"last_status_change_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);