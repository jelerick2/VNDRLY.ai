CREATE TABLE "partner_vendor_work_type_approvals" (
	"id" serial PRIMARY KEY NOT NULL,
	"partner_id" integer NOT NULL,
	"vendor_id" integer NOT NULL,
	"work_type_id" integer NOT NULL,
	"approved_unit_price" numeric(12, 2),
	"approved_unit" text,
	"approved_currency" text DEFAULT 'USD' NOT NULL,
	"approved_at" timestamp with time zone DEFAULT now() NOT NULL,
	"approved_by_user_id" integer
);