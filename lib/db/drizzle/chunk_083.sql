CREATE TABLE "site_location_admin_audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_location_id" integer,
	"action" text NOT NULL,
	"changes" jsonb NOT NULL,
	"actor_user_id" integer,
	"actor_role" text NOT NULL,
	"actor_ip" text,
	"actor_user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);