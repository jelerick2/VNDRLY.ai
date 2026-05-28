CREATE TABLE "partner_contacts" (
	"id" serial PRIMARY KEY NOT NULL,
	"partner_id" integer NOT NULL,
	"job_title" text NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"roles" text[] DEFAULT '{}' NOT NULL,
	"photo_url" text,
	"preferred_locale" text DEFAULT 'en' NOT NULL,
	"user_id" integer,
	"invite_token" text,
	"invite_sent_at" timestamp with time zone,
	"accepted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"deleted_by" text,
	CONSTRAINT "partner_contacts_invite_token_unique" UNIQUE("invite_token")
);