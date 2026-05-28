CREATE TABLE "partner_vendor_approval_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"partner_id" integer NOT NULL,
	"vendor_id" integer NOT NULL,
	"from_status" text,
	"to_status" text NOT NULL,
	"reason" text NOT NULL,
	"reason_detail" jsonb,
	"vendor_catalog_version_id" integer,
	"actor_user_id" integer,
	"actor_role" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "work_type_site_locations" (
	"work_type_id" integer NOT NULL,
	"site_location_id" integer NOT NULL
);
CREATE TABLE "partner_work_type_afes" (
	"id" serial PRIMARY KEY NOT NULL,
	"partner_id" integer NOT NULL,
	"work_type_id" integer NOT NULL,
	"afe" text NOT NULL
);
CREATE TABLE "partner_vendor_work_type_approvals" (
	"id" serial PRIMARY KEY NOT NULL,
	"partner_id" integer NOT NULL,
	"vendor_id" integer NOT NULL,
	"work_type_id" integer NOT NULL,
	"approved_unit_price" numeric(12, 2),
	"approved_unit" text,
	"approved_currency" text DEFAULT 'USD' NOT NULL,
	"approved_at" timestamp with time zone DEFAULT now() NOT NULL,
	"approved_by_user_id" integer
);
CREATE TABLE "partner_vendor_relationships" (
	"id" serial PRIMARY KEY NOT NULL,
	"partner_id" integer NOT NULL,
	"vendor_id" integer NOT NULL,
	"status" text NOT NULL,
	"notes" text,
	"rated_at" timestamp with time zone,
	"approved_at" timestamp with time zone,
	"approved_by_user_id" integer,
	"approved_catalog_version_id" integer,
	"last_status_reason" text,
	"last_status_change_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "vendor_site_location_afes" (
	"id" serial PRIMARY KEY NOT NULL,
	"vendor_id" integer NOT NULL,
	"site_location_id" integer NOT NULL,
	"afe" text NOT NULL
);
CREATE TABLE "site_locations" (
	"id" serial PRIMARY KEY NOT NULL,
	"partner_id" integer NOT NULL,
	"name" text NOT NULL,
	"address" text NOT NULL,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"state" text,
	"site_code" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"hidden" boolean DEFAULT false NOT NULL,
	"site_radius_meters" integer,
	"afe" text,
	"photo_url" text,
	"source_type" text DEFAULT 'manual' NOT NULL,
	"source_ref" text,
	"superseded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "site_locations_site_code_unique" UNIQUE("site_code")
);
CREATE TABLE "site_work_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_location_id" integer NOT NULL,
	"work_type_id" integer NOT NULL,
	"vendor_id" integer NOT NULL,
	"afe" text
);
CREATE TABLE "tickets" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_location_id" integer NOT NULL,
	"vendor_id" integer NOT NULL,
	"field_employee_id" integer,
	"work_type_id" integer NOT NULL,
	"status" text DEFAULT 'initiated' NOT NULL,
	"intake_channel" text DEFAULT 'partner_self_service' NOT NULL,
	"description" text,
	"notes" text,
	"kickback_reason" text,
	"check_in_time" timestamp with time zone,
	"check_out_time" timestamp with time zone,
	"check_in_latitude" double precision,
	"check_in_longitude" double precision,
	"check_out_latitude" double precision,
	"check_out_longitude" double precision,
	"lifecycle_state" text,
	"en_route_at" timestamp with time zone,
	"on_location_at" timestamp with time zone,
	"on_location_latitude" double precision,
	"on_location_longitude" double precision,
	"arrived_at" timestamp with time zone,
	"departure_latitude" double precision,
	"departure_longitude" double precision,
	"starting_mileage" numeric(10, 1),
	"ending_mileage" numeric(10, 1),
	"unlocked_at" timestamp with time zone,
	"unlocked_by_id" integer,
	"unlock_count" integer DEFAULT 0 NOT NULL,
	"created_by_id" integer,
	"closed_by_id" integer,
	"closed_at" timestamp with time zone,
	"pre_cancel_status" text,
	"cancelled_at" timestamp with time zone,
	"cancelled_by_id" integer,
	"scheduled_start_at" timestamp with time zone,
	"scheduled_duration_minutes" integer,
	"foreman_user_id" integer,
	"scheduled_at" timestamp with time zone,
	"scheduled_by_id" integer,
	"late_check_in_reminder_sent_at" timestamp with time zone,
	"approved_at" timestamp with time zone,
	"payment_method" text,
	"payment_reference" text,
	"payment_note" text,
	"payment_dispersed_at" timestamp with time zone,
	"payment_dispersed_by_id" integer,
	"payment_receipt_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
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
CREATE TABLE "ticket_scheduled_notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticket_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"kind" text NOT NULL,
	"fire_at" timestamp with time zone NOT NULL,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "ticket_assignment_rates" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticket_id" integer NOT NULL,
	"employee_id" integer NOT NULL,
	"hourly_rate" numeric(10, 2) NOT NULL,
	"set_by_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "ticket_note_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticket_id" integer NOT NULL,
	"content" text NOT NULL,
	"attachments" text[],
	"mentions" integer[],
	"edit_history" jsonb,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"deleted_by_id" integer,
	"created_by_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "ticket_unlocks" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticket_id" integer NOT NULL,
	"unlocked_by_id" integer,
	"previous_status" text NOT NULL,
	"reason" text DEFAULT '' NOT NULL,
	"unlocked_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "ticket_status_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticket_id" integer NOT NULL,
	"from_status" text,
	"to_status" text NOT NULL,
	"actor_user_id" integer,
	"actor_role" text,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"email" text,
	"password_hash" text NOT NULL,
	"role" text NOT NULL,
	"active_membership_id" integer,
	"display_name" text NOT NULL,
	"preferred_language" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"session_version" integer DEFAULT 1 NOT NULL,
	"suspended_at" timestamp with time zone,
	"suspended_by" integer,
	"must_change_password" boolean DEFAULT false NOT NULL,
	"email_verified_at" timestamp with time zone,
	"email_verify_token" text,
	"email_verify_token_expires_at" timestamp with time zone,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
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
CREATE TABLE "ticket_line_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticket_id" integer NOT NULL,
	"type" text NOT NULL,
	"description" text NOT NULL,
	"quantity" numeric(10, 2) NOT NULL,
	"unit_price" numeric(12, 2) NOT NULL,
	"tax_rate" numeric(6, 4),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "tax_rates" (
	"id" serial PRIMARY KEY NOT NULL,
	"state" text NOT NULL,
	"state_name" text NOT NULL,
	"rate" numeric(6, 4) NOT NULL,
	CONSTRAINT "tax_rates_state_unique" UNIQUE("state")
);
CREATE TABLE "notification_preferences" (
	"user_id" integer PRIMARY KEY NOT NULL,
	"tickets_enabled" boolean DEFAULT true NOT NULL,
	"hotlist_enabled" boolean DEFAULT true NOT NULL,
	"compliance_enabled" boolean DEFAULT true NOT NULL,
	"crew_enabled" boolean DEFAULT true NOT NULL,
	"system_enabled" boolean DEFAULT true NOT NULL,
	"visitor_enabled" boolean DEFAULT true NOT NULL,
	"push_enabled" boolean DEFAULT true NOT NULL,
	"dnd_start_hour" integer,
	"dnd_end_hour" integer,
	"qb_bulk_expiry_in_app_enabled" boolean DEFAULT true NOT NULL,
	"qb_bulk_expiry_email_enabled" boolean DEFAULT true NOT NULL,
	"tickets_email_enabled" boolean DEFAULT true NOT NULL,
	"hotlist_email_enabled" boolean DEFAULT true NOT NULL,
	"compliance_email_enabled" boolean DEFAULT true NOT NULL,
	"crew_email_enabled" boolean DEFAULT false NOT NULL,
	"system_email_enabled" boolean DEFAULT false NOT NULL,
	"visitor_email_enabled" boolean DEFAULT false NOT NULL,
	"email_digest_enabled" boolean DEFAULT false NOT NULL,
	"comments_enabled" boolean DEFAULT true NOT NULL,
	"comment_mention_email_enabled" boolean DEFAULT true NOT NULL,
	"comment_reply_email_enabled" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"type" text NOT NULL,
	"category" text DEFAULT 'system' NOT NULL,
	"dedupe_key" text,
	"title" text NOT NULL,
	"body" text,
	"link" text,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"emailed_at" timestamp with time zone
);
CREATE TABLE "vendor_ratings" (
	"id" serial PRIMARY KEY NOT NULL,
	"vendor_id" integer NOT NULL,
	"partner_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"ticket_id" integer,
	"rating" integer NOT NULL,
	"review" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "password_reset_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "password_reset_tokens_token_hash_unique" UNIQUE("token_hash")
);
CREATE TABLE "location_consents" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"device_id" text NOT NULL,
	"accepted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone
);
CREATE TABLE "guest_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"token_jti" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"phone" text,
	"email" text,
	"company" text,
	"vehicle_plate" text,
	"last_purpose" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "guest_sessions_token_jti_unique" UNIQUE("token_jti")
);
CREATE TABLE "site_visits" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_location_id" integer NOT NULL,
	"guest_session_id" integer,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"phone" text,
	"email" text,
	"company" text,
	"vehicle_plate" text,
	"purpose" text,
	"expected_duration_minutes" integer,
	"host_type" text NOT NULL,
	"host_partner_id" integer,
	"host_vendor_id" integer,
	"check_in_time" timestamp with time zone DEFAULT now() NOT NULL,
	"check_in_latitude" double precision,
	"check_in_longitude" double precision,
	"check_out_time" timestamp with time zone,
	"check_out_latitude" double precision,
	"check_out_longitude" double precision,
	"auto_checked_out" boolean DEFAULT false NOT NULL,
	"safety_acknowledged_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone
);
CREATE TABLE "vendor_partner_billing_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"vendor_id" integer NOT NULL,
	"partner_id" integer NOT NULL,
	"cadence" text DEFAULT 'per_ticket' NOT NULL,
	"payment_terms_days" integer DEFAULT 30 NOT NULL,
	"remit_to_address" text,
	"remit_to_name" text,
	"mileage_auto_suggest" boolean DEFAULT false NOT NULL,
	"mileage_rate" numeric(10, 4),
	"overtime_multiplier" numeric(4, 2) DEFAULT '1.50' NOT NULL,
	"late_fee_rule" jsonb,
	"default_income_category_overrides" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "invoices" (
	"id" serial PRIMARY KEY NOT NULL,
	"invoice_number" text NOT NULL,
	"vendor_id" integer NOT NULL,
	"partner_id" integer NOT NULL,
	"cadence" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"period_start" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"due_date" timestamp with time zone,
	"payment_terms_days" integer,
	"remit_to_address" text,
	"remit_to_name" text,
	"subtotal" numeric(14, 2) DEFAULT '0' NOT NULL,
	"tax_total" numeric(14, 2) DEFAULT '0' NOT NULL,
	"total" numeric(14, 2) DEFAULT '0' NOT NULL,
	"paid_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"credited_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"billing_contact_email" text,
	"notes" text,
	"supplemental_of_invoice_id" integer,
	"late_fee_rule" jsonb,
	"stripe_payment_intent_id" text,
	"stripe_charge_id" text,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone,
	"paid_at" timestamp with time zone,
	"last_recomputed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "invoice_lines" (
	"id" serial PRIMARY KEY NOT NULL,
	"invoice_id" integer NOT NULL,
	"ticket_id" integer,
	"source_type" text NOT NULL,
	"source_id" integer,
	"afe" text,
	"line_type" text NOT NULL,
	"description" text NOT NULL,
	"quantity" numeric(12, 4) NOT NULL,
	"unit" text,
	"unit_price" numeric(14, 4) NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"taxable" boolean DEFAULT true NOT NULL,
	"tax_state" text,
	"tax_rate" numeric(6, 4),
	"tax_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"is_manual_override" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"income_category" text DEFAULT 'nec' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "invoice_ticket_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"invoice_id" integer NOT NULL,
	"ticket_id" integer NOT NULL,
	"approved_at" timestamp with time zone NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "invoice_rate_card_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"invoice_id" integer NOT NULL,
	"ticket_id" integer,
	"snapshot" jsonb NOT NULL,
	"captured_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "invoice_payment_audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"payment_id" integer NOT NULL,
	"invoice_id" integer NOT NULL,
	"action" text NOT NULL,
	"actor_user_id" integer,
	"reason" text,
	"amount" numeric(14, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
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
CREATE TABLE "invoice_credit_memos" (
	"id" serial PRIMARY KEY NOT NULL,
	"invoice_id" integer NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"reason" text NOT NULL,
	"created_by_user_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "invoice_line_category_backfill_audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"run_id" uuid NOT NULL,
	"line_id" integer,
	"invoice_id" integer,
	"vendor_id" integer,
	"partner_id" integer,
	"line_type" text NOT NULL,
	"old_income_category" text NOT NULL,
	"new_income_category" text NOT NULL,
	"actor_user_id" integer,
	"actor_role" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "invoice_line_category_audit" (
	"id" serial PRIMARY KEY NOT NULL,
	"batch_id" uuid NOT NULL,
	"action" text NOT NULL,
	"invoice_id" integer,
	"line_id" integer,
	"vendor_id" integer,
	"partner_id" integer,
	"prior_income_category" text NOT NULL,
	"prior_is_manual_override" boolean NOT NULL,
	"new_income_category" text NOT NULL,
	"new_is_manual_override" boolean NOT NULL,
	"actor_user_id" integer,
	"actor_role" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "invoice_send_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"invoice_id" integer NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_to_email" text NOT NULL,
	"sent_by_user_id" integer,
	"sendgrid_message_id" text,
	"pdf_bytes" integer,
	"failure_message" text
);
CREATE TABLE "invoice_reminder_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"invoice_id" integer NOT NULL,
	"kind" text NOT NULL,
	"threshold" text,
	"dedupe_key" text NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_to_email" text,
	"sent_by_user_id" integer,
	"failure_message" text,
	"notes" text
);
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