CREATE TABLE "schedule_cert_override_audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticket_id" integer,
	"blocking_certifications" jsonb NOT NULL,
	"missing_by_employee" jsonb NOT NULL,
	"actor_user_id" integer,
	"actor_role" text NOT NULL,
	"actor_ip" text,
	"actor_user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);