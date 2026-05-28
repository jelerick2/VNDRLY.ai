CREATE TABLE "invoice_ticket_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"invoice_id" integer NOT NULL,
	"ticket_id" integer NOT NULL,
	"approved_at" timestamp with time zone NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL
);