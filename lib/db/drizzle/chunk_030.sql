CREATE TABLE "platform_settings_audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"field" text NOT NULL,
	"prev_value" text,
	"new_value" text,
	"actor_user_id" integer,
	"actor_role" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);