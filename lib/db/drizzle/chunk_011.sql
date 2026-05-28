CREATE TABLE "certification_reminder_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"certification_id" integer NOT NULL,
	"threshold" text NOT NULL,
	"dedupe_key" text NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_to_vendor_id" integer,
	"failure_message" text
);