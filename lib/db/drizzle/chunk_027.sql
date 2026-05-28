CREATE TABLE "onboarding_progress" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_type" text NOT NULL,
	"partner_id" integer,
	"vendor_id" integer,
	"vendor_people_id" integer,
	"current_step" text DEFAULT '' NOT NULL,
	"completed_steps" text[] DEFAULT '{}' NOT NULL,
	"skipped_steps" text[] DEFAULT '{}' NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);