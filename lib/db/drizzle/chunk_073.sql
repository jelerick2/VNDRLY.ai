CREATE TABLE "invoice_payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"invoice_id" integer NOT NULL,
	"method" text NOT NULL,
	"reference_number" text,
	"amount" numeric(14, 2) NOT NULL,
	"paid_at" timestamp with time zone NOT NULL,
	"recorded_by_user_id" integer,
	"notes" text,
	"marked_by_partner" boolean DEFAULT false NOT NULL,
	"voided_at" timestamp with time zone,
	"voided_by_user_id" integer,
	"voided_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);