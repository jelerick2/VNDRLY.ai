CREATE TABLE "ticket_crew" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticket_id" integer NOT NULL,
	"employee_id" integer NOT NULL,
	"added_by_user_id" integer,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	"removed_at" timestamp with time zone,
	"removed_by_user_id" integer,
	"ack_status" text DEFAULT 'pending' NOT NULL,
	"ack_at" timestamp with time zone,
	"ack_note" text,
	"en_route_remind_sent_at" timestamp with time zone
);