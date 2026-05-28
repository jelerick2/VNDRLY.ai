CREATE TABLE "invoice_line_category_backfill_audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"run_id" uuid NOT NULL,
	"line_id" integer,
	"invoice_id" integer,
	"vendor_id" integer,
	"partner_id" integer,
	"line_type" text NOT NULL,
	"old_income_category" text NOT NULL,
	"new_income_category" text NOT NULL,
	"actor_user_id" integer,
	"actor_role" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);