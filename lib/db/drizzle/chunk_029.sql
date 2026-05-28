CREATE TABLE "platform_settings" (
	"id" integer PRIMARY KEY NOT NULL,
	"name" text DEFAULT 'VNDRLY' NOT NULL,
	"contact_name" text,
	"contact_email" text,
	"contact_phone" text,
	"physical_address" text,
	"billing_address" text,
	"business_phone" text,
	"hours_of_operation" text,
	"blurb" text,
	"logo_url" text,
	"logo_square_url" text,
	"brand_primary_color" text,
	"brand_accent_color" text,
	"qb_bulk_action_retention_days" integer,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);