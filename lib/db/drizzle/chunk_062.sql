CREATE TABLE "vendor_ratings" (
	"id" serial PRIMARY KEY NOT NULL,
	"vendor_id" integer NOT NULL,
	"partner_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"ticket_id" integer,
	"rating" integer NOT NULL,
	"review" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);