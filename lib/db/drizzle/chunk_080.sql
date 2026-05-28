CREATE TABLE "report_export_audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"report_kind" text NOT NULL,
	"format" text NOT NULL,
	"scope" jsonb NOT NULL,
	"detail_json" jsonb,
	"row_count" integer,
	"file_bytes" integer NOT NULL,
	"downloaded_by_user_id" integer,
	"user_role" text NOT NULL,
	"user_ip" text,
	"user_agent" text,
	"accounting_digest_emailed_at" timestamp with time zone,
	"accounting_reconciliation_digest_emailed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);