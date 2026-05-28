CREATE TABLE "ticket_line_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticket_id" integer NOT NULL,
	"type" text NOT NULL,
	"description" text NOT NULL,
	"quantity" numeric(10, 2) NOT NULL,
	"unit_price" numeric(12, 2) NOT NULL,
	"tax_rate" numeric(6, 4),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);