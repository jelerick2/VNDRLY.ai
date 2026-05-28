CREATE TABLE "gps_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticket_id" integer NOT NULL,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"event_type" text NOT NULL,
	"battery_level" real,
	"speed_mps" real,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL
);