CREATE TABLE "fire_transmitter_settings" (
	"id" integer PRIMARY KEY NOT NULL,
	"tcc" text,
	"ein" text,
	"name" text,
	"address" text,
	"contact_name" text,
	"contact_email" text,
	"contact_phone" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by_user_id" integer
);