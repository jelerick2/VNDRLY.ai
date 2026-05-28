CREATE TABLE "comment_read_receipts" (
	"id" serial PRIMARY KEY NOT NULL,
	"source" text NOT NULL,
	"comment_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"seen_at" timestamp with time zone DEFAULT now() NOT NULL
);