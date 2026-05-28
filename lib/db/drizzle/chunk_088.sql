CREATE TABLE "qb_account_mapping_cleanup_audit" (
	"id" serial PRIMARY KEY NOT NULL,
	"actor_user_id" integer,
	"actor_role" text NOT NULL,
	"deleted_count" integer NOT NULL,
	"protected_recent" integer NOT NULL,
	"retention_days" integer NOT NULL,
	"min_retained" integer NOT NULL,
	"cutoff" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);