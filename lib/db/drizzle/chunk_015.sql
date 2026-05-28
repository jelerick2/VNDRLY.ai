CREATE TABLE "dashboard_1099_email_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"scope" text NOT NULL,
	"partner_id" integer,
	"enabled" boolean DEFAULT false NOT NULL,
	"formats" text DEFAULT 'pdf' NOT NULL,
	"recipient_emails" text DEFAULT '' NOT NULL,
	"tax_year_override" integer,
	"updated_by_user_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);