CREATE TABLE "qb_account_mapping" (
	"id" serial PRIMARY KEY NOT NULL,
	"vendor_id" integer,
	"partner_id" integer,
	"line_type" text NOT NULL,
	"account_name" text NOT NULL,
	"account_number" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);