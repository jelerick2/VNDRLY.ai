CREATE TABLE "tax_1099_correction_audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"filing_id" integer,
	"tax_year" integer NOT NULL,
	"form_type" text NOT NULL,
	"payer_partner_id" integer NOT NULL,
	"recipient_vendor_id" integer NOT NULL,
	"from_status" text NOT NULL,
	"to_status" text NOT NULL,
	"actor_user_id" integer,
	"actor_role" text NOT NULL,
	"actor_ip" text,
	"actor_user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);