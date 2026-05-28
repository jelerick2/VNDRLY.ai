CREATE TABLE "qb_account_mapping_bulk_actions" (
	"id" serial PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"actor_user_id" integer,
	"actor_role" text NOT NULL,
	"summary" text NOT NULL,
	"snapshots" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"undone_at" timestamp with time zone,
	"undone_by_user_id" integer,
	"expiry_warning_processed_at" timestamp with time zone
);