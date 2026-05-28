CREATE TABLE "payment_audit" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticket_id" integer NOT NULL,
	"action" text NOT NULL,
	"reason" text NOT NULL,
	"actor_user_id" integer,
	"actor_role" text NOT NULL,
	"payment_method_snapshot" text,
	"payment_reference_snapshot" text,
	"payment_note_snapshot" text,
	"payment_dispersed_at_snapshot" timestamp with time zone,
	"payment_dispersed_by_id_snapshot" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);