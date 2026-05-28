CREATE TABLE "vendor_work_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"vendor_id" integer NOT NULL,
	"work_type_id" integer NOT NULL,
	"unit_price" numeric(12, 2),
	"unit" text,
	"currency" text DEFAULT 'USD' NOT NULL,
	"notes" text,
	"price_authority_acknowledged_at" timestamp with time zone,
	"last_price_change_reason" text
);