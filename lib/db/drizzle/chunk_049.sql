CREATE TABLE "ticket_check_ins" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticket_id" integer NOT NULL,
	"employee_id" integer NOT NULL,
	"check_in_at" timestamp with time zone NOT NULL,
	"check_in_latitude" double precision,
	"check_in_longitude" double precision,
	"check_out_at" timestamp with time zone,
	"check_out_latitude" double precision,
	"check_out_longitude" double precision,
	"hourly_rate_at_time" numeric(8, 2),
	"source" text DEFAULT 'manual' NOT NULL,
	"corrected_by_id" integer,
	"corrected_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);