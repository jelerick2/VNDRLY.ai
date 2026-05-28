CREATE TABLE "invoice_line_category_audit" (
	"id" serial PRIMARY KEY NOT NULL,
	"batch_id" uuid NOT NULL,
	"action" text NOT NULL,
	"invoice_id" integer,
	"line_id" integer,
	"vendor_id" integer,
	"partner_id" integer,
	"prior_income_category" text NOT NULL,
	"prior_is_manual_override" boolean NOT NULL,
	"new_income_category" text NOT NULL,
	"new_is_manual_override" boolean NOT NULL,
	"actor_user_id" integer,
	"actor_role" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);