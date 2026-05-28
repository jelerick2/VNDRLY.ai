CREATE TABLE "dashboard_1099_email_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"scope" text NOT NULL,
	"partner_id" integer,
	"tax_year" integer NOT NULL,
	"cadence" text NOT NULL,
	"period_label" text NOT NULL,
	"dedupe_key" text NOT NULL,
	"recipient_emails_csv" text DEFAULT '' NOT NULL,
	"formats_csv" text DEFAULT '' NOT NULL,
	"report_export_audit_ids_csv" text,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	"failure_message" text
);