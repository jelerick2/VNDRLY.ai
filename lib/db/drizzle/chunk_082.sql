CREATE TABLE "vendor_merge_audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"survivor_vendor_id" integer,
	"survivor_vendor_name" text NOT NULL,
	"loser_vendor_id" integer NOT NULL,
	"loser_vendor_name" text NOT NULL,
	"loser_snapshot" jsonb NOT NULL,
	"counts" jsonb NOT NULL,
	"moved_row_ids" jsonb,
	"total_moved" integer NOT NULL,
	"total_conflict_deleted" integer NOT NULL,
	"actor_user_id" integer,
	"actor_role" text NOT NULL,
	"actor_ip" text,
	"actor_user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reverted_at" timestamp with time zone,
	"reverted_by_user_id" integer
);