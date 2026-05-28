CREATE TABLE "user_org_memberships" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"org_type" text NOT NULL,
	"partner_id" integer,
	"vendor_id" integer,
	"role" text NOT NULL,
	"vendor_people_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_org_memberships_org_type_check" CHECK ("user_org_memberships"."org_type" IN ('partner','vendor')),
	CONSTRAINT "user_org_memberships_org_shape_check" CHECK ((
        ("user_org_memberships"."org_type" = 'partner' AND "user_org_memberships"."partner_id" IS NOT NULL AND "user_org_memberships"."vendor_id" IS NULL)
        OR
        ("user_org_memberships"."org_type" = 'vendor' AND "user_org_memberships"."vendor_id" IS NOT NULL AND "user_org_memberships"."partner_id" IS NULL)
      )),
	CONSTRAINT "user_org_memberships_role_check" CHECK ("user_org_memberships"."role" IN ('admin','member','ap','field_employee'))
);