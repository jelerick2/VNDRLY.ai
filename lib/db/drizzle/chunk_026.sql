CREATE TABLE "hotlist_jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"partner_id" integer NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"location_address" text NOT NULL,
	"latitude" double precision,
	"longitude" double precision,
	"deadline" date,
	"estimated_duration_days" integer,
	"status" text DEFAULT 'open' NOT NULL,
	"awarded_bid_id" integer,
	"awarded_vendor_id" integer,
	"converted_ticket_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);