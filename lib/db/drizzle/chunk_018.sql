CREATE TABLE "employee_certifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"name" text NOT NULL,
	"issuer" text,
	"cert_number" text,
	"issued_date" date,
	"expiration_date" date,
	"document_url" text,
	"document_path" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"deleted_by" text
);