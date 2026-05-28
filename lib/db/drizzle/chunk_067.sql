CREATE TABLE "vendor_partner_billing_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"vendor_id" integer NOT NULL,
	"partner_id" integer NOT NULL,
	"cadence" text DEFAULT 'per_ticket' NOT NULL,
	"payment_terms_days" integer DEFAULT 30 NOT NULL,
	"remit_to_address" text,
	"remit_to_name" text,
	"mileage_auto_suggest" boolean DEFAULT false NOT NULL,
	"mileage_rate" numeric(10, 4),
	"overtime_multiplier" numeric(4, 2) DEFAULT '1.50' NOT NULL,
	"late_fee_rule" jsonb,
	"default_income_category_overrides" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);