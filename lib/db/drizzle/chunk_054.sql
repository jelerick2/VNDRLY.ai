CREATE TABLE "ticket_unlocks" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticket_id" integer NOT NULL,
	"unlocked_by_id" integer,
	"previous_status" text NOT NULL,
	"reason" text DEFAULT '' NOT NULL,
	"unlocked_at" timestamp with time zone DEFAULT now() NOT NULL
);