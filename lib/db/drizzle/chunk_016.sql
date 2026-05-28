CREATE TABLE "demo_user_label_overrides" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"locale" text NOT NULL,
	"label" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);