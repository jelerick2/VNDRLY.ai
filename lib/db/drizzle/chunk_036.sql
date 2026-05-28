CREATE TABLE "work_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"description" text,
	"estimated_duration" text,
	"estimated_price" numeric(12, 2),
	"required_certifications" text[],
	"blocking_certifications" text[]
);