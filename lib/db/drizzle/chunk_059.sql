CREATE TABLE "tax_rates" (
	"id" serial PRIMARY KEY NOT NULL,
	"state" text NOT NULL,
	"state_name" text NOT NULL,
	"rate" numeric(6, 4) NOT NULL,
	CONSTRAINT "tax_rates_state_unique" UNIQUE("state")
);