CREATE TABLE "invoice_send_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"invoice_id" integer NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_to_email" text NOT NULL,
	"sent_by_user_id" integer,
	"sendgrid_message_id" text,
	"pdf_bytes" integer,
	"failure_message" text
);