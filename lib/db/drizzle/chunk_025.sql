CREATE TABLE "hotlist_comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"job_id" integer NOT NULL,
	"content" text NOT NULL,
	"attachments" text[],
	"mentions" integer[],
	"edit_history" jsonb,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"deleted_by_id" integer,
	"created_by_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);