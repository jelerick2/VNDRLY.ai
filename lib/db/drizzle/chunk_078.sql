CREATE TABLE "invoice_reminder_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"invoice_id" integer NOT NULL,
	"kind" text NOT NULL,
	"threshold" text,
	"dedupe_key" text NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_to_email" text,
	"sent_by_user_id" integer,
	"failure_message" text,
	"notes" text
);