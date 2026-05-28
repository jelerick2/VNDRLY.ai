CREATE TABLE "partner_work_type_afes" (
	"id" serial PRIMARY KEY NOT NULL,
	"partner_id" integer NOT NULL,
	"work_type_id" integer NOT NULL,
	"afe" text NOT NULL
);