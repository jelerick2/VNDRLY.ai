CREATE TABLE "direct_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"partner_id" integer NOT NULL,
	"site_location_id" integer NOT NULL,
	"vendor_id" integer NOT NULL,
	"scope_of_work" text,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"pass_reason" text,
	"created_by_user_id" integer,
	"responded_by_user_id" integer,
	"responded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "direct_assignments_status_check" CHECK ("direct_assignments"."status" IN ('pending','committed','passed','cancelled'))
);