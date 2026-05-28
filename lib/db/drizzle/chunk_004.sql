CREATE TABLE "accounting_connection_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"connection_id" integer NOT NULL,
	"line_type" text NOT NULL,
	"qbo_item_id" text NOT NULL,
	"qbo_account_id" text,
	"qbo_account_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);