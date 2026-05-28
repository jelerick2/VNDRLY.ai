CREATE TABLE "accounting_pushed_invoices" (
	"id" serial PRIMARY KEY NOT NULL,
	"vendor_id" integer NOT NULL,
	"provider" text NOT NULL,
	"invoice_number" text NOT NULL,
	"external_invoice_id" text,
	"external_doc_number" text,
	"pushed_at" timestamp with time zone DEFAULT now() NOT NULL
);