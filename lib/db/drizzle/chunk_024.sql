CREATE TABLE "hotlist_bids" (
	"id" serial PRIMARY KEY NOT NULL,
	"job_id" integer NOT NULL,
	"vendor_id" integer NOT NULL,
	"amount_usd" numeric(12, 2) NOT NULL,
	"eta_days" integer,
	"notes" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);