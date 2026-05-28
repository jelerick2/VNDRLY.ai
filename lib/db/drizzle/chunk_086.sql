CREATE TABLE "qb_account_mapping_audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"action" text NOT NULL,
	"mapping_id" integer,
	"vendor_id" integer,
	"partner_id" integer,
	"line_type" text NOT NULL,
	"old_values" jsonb,
	"new_values" jsonb,
	"actor_user_id" integer,
	"actor_role" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);