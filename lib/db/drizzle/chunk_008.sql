CREATE TABLE "ap_payment_digest_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"partner_id" integer NOT NULL,
	"week_label" text NOT NULL,
	"dedupe_key" text NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ticket_count" integer DEFAULT 0 NOT NULL,
	"failure_message" text
);