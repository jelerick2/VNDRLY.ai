CREATE SEQUENCE "public"."hotlist_comment_events_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;
CREATE SEQUENCE "public"."live_location_events_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;
CREATE SEQUENCE "public"."ticket_events_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;
CREATE SEQUENCE "public"."visit_events_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;
CREATE TABLE "accounting_connection_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"connection_id" integer NOT NULL,
	"line_type" text NOT NULL,
	"qbo_item_id" text NOT NULL,
	"qbo_account_id" text,
	"qbo_account_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "accounting_connection_reminder_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"connection_id" integer NOT NULL,
	"reason" text NOT NULL,
	"dedupe_key" text NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	"recipient_count" integer DEFAULT 0 NOT NULL,
	"failure_message" text
);
CREATE TABLE "accounting_connections" (
	"id" serial PRIMARY KEY NOT NULL,
	"vendor_id" integer NOT NULL,
	"provider" text NOT NULL,
	"realm_id" text,
	"display_name" text,
	"access_token_enc" text NOT NULL,
	"refresh_token_enc" text,
	"access_token_expires_at" timestamp with time zone,
	"scopes" text,
	"status" text DEFAULT 'active' NOT NULL,
	"api_base_url" text,
	"created_by_user_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "accounting_pushed_invoices" (
	"id" serial PRIMARY KEY NOT NULL,
	"vendor_id" integer NOT NULL,
	"provider" text NOT NULL,
	"invoice_number" text NOT NULL,
	"external_invoice_id" text,
	"external_doc_number" text,
	"pushed_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "ap_payment_digest_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"partner_id" integer NOT NULL,
	"week_label" text NOT NULL,
	"dedupe_key" text NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ticket_count" integer DEFAULT 0 NOT NULL,
	"failure_message" text
);
CREATE TABLE "assistant_conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"title" text DEFAULT 'New conversation' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "assistant_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"conversation_id" integer NOT NULL,
	"role" text NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"tool_calls" jsonb DEFAULT '[]'::jsonb,
	"first_token_ms" integer,
	"refusal" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "certification_reminder_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"certification_id" integer NOT NULL,
	"threshold" text NOT NULL,
	"dedupe_key" text NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_to_vendor_id" integer,
	"failure_message" text
);
CREATE TABLE "comment_read_receipts" (
	"id" serial PRIMARY KEY NOT NULL,
	"source" text NOT NULL,
	"comment_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"seen_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "dashboard_1099_delivery_jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"scope" text NOT NULL,
	"partner_id" integer,
	"tax_year" integer NOT NULL,
	"form_type" text NOT NULL,
	"recipient_vendor_ids" jsonb,
	"status" text DEFAULT 'pending' NOT NULL,
	"total_count" integer DEFAULT 0 NOT NULL,
	"attempted" integer DEFAULT 0 NOT NULL,
	"delivered" integer DEFAULT 0 NOT NULL,
	"skipped_no_consent" integer DEFAULT 0 NOT NULL,
	"errors_json" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"last_error_message" text,
	"created_by_user_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone
);
CREATE TABLE "dashboard_1099_email_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"scope" text NOT NULL,
	"partner_id" integer,
	"tax_year" integer NOT NULL,
	"cadence" text NOT NULL,
	"period_label" text NOT NULL,
	"dedupe_key" text NOT NULL,
	"recipient_emails_csv" text DEFAULT '' NOT NULL,
	"formats_csv" text DEFAULT '' NOT NULL,
	"report_export_audit_ids_csv" text,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	"failure_message" text
);
CREATE TABLE "dashboard_1099_email_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"scope" text NOT NULL,
	"partner_id" integer,
	"enabled" boolean DEFAULT false NOT NULL,
	"formats" text DEFAULT 'pdf' NOT NULL,
	"recipient_emails" text DEFAULT '' NOT NULL,
	"tax_year_override" integer,
	"updated_by_user_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "demo_user_label_overrides" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"locale" text NOT NULL,
	"label" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "direct_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"partner_id" integer NOT NULL,
	"site_location_id" integer NOT NULL,
	"vendor_id" integer NOT NULL,
	"scope_of_work" text,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"pass_reason" text,
	"created_by_user_id" integer,
	"responded_by_user_id" integer,
	"responded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "direct_assignments_status_check" CHECK ("direct_assignments"."status" IN ('pending','committed','passed','cancelled'))
);
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
CREATE TABLE "field_employee_notes" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "field_push_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"expo_token" text NOT NULL,
	"platform" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "field_push_tokens_expo_token_unique" UNIQUE("expo_token")
);
CREATE TABLE "fire_transmitter_settings" (
	"id" integer PRIMARY KEY NOT NULL,
	"tcc" text,
	"ein" text,
	"name" text,
	"address" text,
	"contact_name" text,
	"contact_email" text,
	"contact_phone" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by_user_id" integer
);
CREATE TABLE "fire_transmitter_settings_audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"changes" jsonb NOT NULL,
	"actor_user_id" integer,
	"actor_role" text NOT NULL,
	"actor_ip" text,
	"actor_user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
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
CREATE TABLE "hotlist_bids" (
	"id" serial PRIMARY KEY NOT NULL,
	"job_id" integer NOT NULL,
	"vendor_id" integer NOT NULL,
	"amount_usd" numeric(12, 2) NOT NULL,
	"eta_days" integer,
	"notes" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "hotlist_comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"job_id" integer NOT NULL,
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
CREATE TABLE "hotlist_jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"partner_id" integer NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"location_address" text NOT NULL,
	"latitude" double precision,
	"longitude" double precision,
	"deadline" date,
	"estimated_duration_days" integer,
	"status" text DEFAULT 'open' NOT NULL,
	"awarded_bid_id" integer,
	"awarded_vendor_id" integer,
	"converted_ticket_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
CREATE TABLE "onboarding_progress" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_type" text NOT NULL,
	"partner_id" integer,
	"vendor_id" integer,
	"vendor_people_id" integer,
	"current_step" text DEFAULT '' NOT NULL,
	"completed_steps" text[] DEFAULT '{}' NOT NULL,
	"skipped_steps" text[] DEFAULT '{}' NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "partners" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"contact_name" text NOT NULL,
	"contact_email" text NOT NULL,
	"contact_phone" text,
	"physical_address" text,
	"billing_address" text,
	"business_phone" text,
	"hours_of_operation" text,
	"state_tax_id" text,
	"federal_tax_id" text,
	"blurb" text,
	"operating_radius_miles" integer,
	"logo_url" text,
	"logo_square_url" text,
	"brand_primary_color" text,
	"brand_accent_color" text,
	"email_1099_subject" text,
	"email_1099_body" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "platform_settings" (
	"id" integer PRIMARY KEY NOT NULL,
	"name" text DEFAULT 'VNDRLY' NOT NULL,
	"contact_name" text,
	"contact_email" text,
	"contact_phone" text,
	"physical_address" text,
	"billing_address" text,
	"business_phone" text,
	"hours_of_operation" text,
	"blurb" text,
	"logo_url" text,
	"logo_square_url" text,
	"brand_primary_color" text,
	"brand_accent_color" text,
	"qb_bulk_action_retention_days" integer,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "platform_settings_audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"field" text NOT NULL,
	"prev_value" text,
	"new_value" text,
	"actor_user_id" integer,
	"actor_role" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "partner_contacts" (
	"id" serial PRIMARY KEY NOT NULL,
	"partner_id" integer NOT NULL,
	"job_title" text NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"roles" text[] DEFAULT '{}' NOT NULL,
	"photo_url" text,
	"preferred_locale" text DEFAULT 'en' NOT NULL,
	"user_id" integer,
	"invite_token" text,
	"invite_sent_at" timestamp with time zone,
	"accepted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"deleted_by" text,
	CONSTRAINT "partner_contacts_invite_token_unique" UNIQUE("invite_token")
);
CREATE TABLE "partner_notes" (
	"id" serial PRIMARY KEY NOT NULL,
	"partner_id" integer NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "vendor_people" (
	"id" serial PRIMARY KEY NOT NULL,
	"vendor_id" integer NOT NULL,
	"vendor_role" text DEFAULT 'office' NOT NULL,
	"roles" text[] DEFAULT '{}' NOT NULL,
	"job_title" text,
	"first_name" text NOT NULL,
	"last_name" text DEFAULT '' NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"pec_certification" boolean DEFAULT false NOT NULL,
	"pec_expiration_date" date,
	"photo_url" text,
	"profile_photo_path" text,
	"hourly_rate" numeric(8, 2),
	"rate_kind" text DEFAULT 'hourly' NOT NULL,
	"daily_rate" numeric(10, 2),
	"user_id" integer,
	"invite_token" text,
	"invite_sent_at" timestamp with time zone,
	"preferred_language" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"deleted_by" text,
	CONSTRAINT "vendor_people_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "vendor_people_invite_token_unique" UNIQUE("invite_token")
);
CREATE TABLE "vendor_notes" (
	"id" serial PRIMARY KEY NOT NULL,
	"vendor_id" integer NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "vendors" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"contact_name" text NOT NULL,
	"contact_email" text NOT NULL,
	"contact_phone" text,
	"physical_address" text,
	"billing_address" text,
	"operating_radius_miles" integer,
	"latitude" double precision,
	"longitude" double precision,
	"geocoded_at" timestamp with time zone,
	"state_tax_id" text,
	"federal_tax_id" text,
	"business_phone" text,
	"hours_of_operation" text,
	"blurb" text,
	"logo_url" text,
	"logo_square_url" text,
	"brand_primary_color" text,
	"brand_accent_color" text,
	"daily_ot_hours" numeric(5, 2),
	"weekly_ot_hours" numeric(5, 2),
	"overtime_multiplier" numeric(4, 2),
	"insurance_carrier" text,
	"insurance_policy_number" text,
	"insurance_expiration_date" text,
	"coi_document_url" text,
	"wc_carrier" text,
	"wc_policy_number" text,
	"wc_expiration_date" text,
	"wc_document_url" text,
	"gl_carrier" text,
	"gl_policy_number" text,
	"gl_expiration_date" text,
	"gl_document_url" text,
	"auto_liability_carrier" text,
	"auto_liability_policy_number" text,
	"auto_liability_expiration_date" text,
	"auto_liability_document_url" text,
	"w9_document_url" text,
	"w9_last_updated_at" timestamp with time zone,
	"current_catalog_version_id" integer,
	"catalog_authority_attested_at" timestamp with time zone,
	"catalog_authority_attested_by_user_id" integer,
	"aging_threshold_days" jsonb DEFAULT '[1,15,30]'::jsonb NOT NULL,
	"e_delivery_consent" boolean DEFAULT false NOT NULL,
	"e_delivery_consent_at" timestamp with time zone,
	"e_delivery_email" text,
	"accounting_failure_notifications_enabled" boolean DEFAULT true NOT NULL,
	"accounting_reconciliation_notifications_enabled" boolean DEFAULT false NOT NULL,
	"accounting_reconciliation_digest_cadence" text DEFAULT 'per_push' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
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
CREATE TABLE "vendor_work_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"vendor_id" integer NOT NULL,
	"work_type_id" integer NOT NULL,
	"unit_price" numeric(12, 2),
	"unit" text,
	"currency" text DEFAULT 'USD' NOT NULL,
	"notes" text,
	"price_authority_acknowledged_at" timestamp with time zone,
	"last_price_change_reason" text
);
CREATE TABLE "vendor_catalog_versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"vendor_id" integer NOT NULL,
	"version" integer NOT NULL,
	"published_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_by_user_id" integer,
	"change_summary" text,
	"rates_snapshot" jsonb NOT NULL,
	"work_types_snapshot" jsonb NOT NULL,
	"compliance_snapshot" jsonb NOT NULL,
	"eula_text" text NOT NULL,
	"eula_hash" text
);
CREATE TABLE "partner_eula_acceptances" (
	"id" serial PRIMARY KEY NOT NULL,
	"partner_id" integer NOT NULL,
	"vendor_id" integer NOT NULL,
	"vendor_catalog_version_id" integer NOT NULL,
	"accepted_by_user_id" integer NOT NULL,
	"accepted_eula_hash" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"accepted_at" timestamp with time zone DEFAULT now() NOT NULL
);
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
CREATE TABLE "report_export_audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"report_kind" text NOT NULL,
	"format" text NOT NULL,
	"scope" jsonb NOT NULL,
	"detail_json" jsonb,
	"row_count" integer,
	"file_bytes" integer NOT NULL,
	"downloaded_by_user_id" integer,
	"user_role" text NOT NULL,
	"user_ip" text,
	"user_agent" text,
	"accounting_digest_emailed_at" timestamp with time zone,
	"accounting_reconciliation_digest_emailed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "reconciliation_weekly_recap_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"vendor_id" integer NOT NULL,
	"week_label" text NOT NULL,
	"dedupe_key" text NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	"audit_row_count" integer DEFAULT 0 NOT NULL,
	"warning_count" integer DEFAULT 0 NOT NULL,
	"failure_message" text
);
CREATE TABLE "vendor_merge_audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"survivor_vendor_id" integer,
	"survivor_vendor_name" text NOT NULL,
	"loser_vendor_id" integer NOT NULL,
	"loser_vendor_name" text NOT NULL,
	"loser_snapshot" jsonb NOT NULL,
	"counts" jsonb NOT NULL,
	"moved_row_ids" jsonb,
	"total_moved" integer NOT NULL,
	"total_conflict_deleted" integer NOT NULL,
	"actor_user_id" integer,
	"actor_role" text NOT NULL,
	"actor_ip" text,
	"actor_user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reverted_at" timestamp with time zone,
	"reverted_by_user_id" integer
);
CREATE TABLE "site_location_admin_audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_location_id" integer,
	"action" text NOT NULL,
	"changes" jsonb NOT NULL,
	"actor_user_id" integer,
	"actor_role" text NOT NULL,
	"actor_ip" text,
	"actor_user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "schedule_cert_override_audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticket_id" integer,
	"blocking_certifications" jsonb NOT NULL,
	"missing_by_employee" jsonb NOT NULL,
	"actor_user_id" integer,
	"actor_role" text NOT NULL,
	"actor_ip" text,
	"actor_user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "qb_account_mapping" (
	"id" serial PRIMARY KEY NOT NULL,
	"vendor_id" integer,
	"partner_id" integer,
	"line_type" text NOT NULL,
	"account_name" text NOT NULL,
	"account_number" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "qb_account_mapping_audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"action" text NOT NULL,
	"mapping_id" integer,
	"vendor_id" integer,
	"partner_id" integer,
	"line_type" text NOT NULL,
	"old_values" jsonb,
	"new_values" jsonb,
	"actor_user_id" integer,
	"actor_role" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "qb_account_mapping_bulk_actions" (
	"id" serial PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"actor_user_id" integer,
	"actor_role" text NOT NULL,
	"summary" text NOT NULL,
	"snapshots" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"undone_at" timestamp with time zone,
	"undone_by_user_id" integer,
	"expiry_warning_processed_at" timestamp with time zone
);
CREATE TABLE "qb_account_mapping_cleanup_audit" (
	"id" serial PRIMARY KEY NOT NULL,
	"actor_user_id" integer,
	"actor_role" text NOT NULL,
	"deleted_count" integer NOT NULL,
	"protected_recent" integer NOT NULL,
	"retention_days" integer NOT NULL,
	"min_retained" integer NOT NULL,
	"cutoff" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "tax_1099_filings" (
	"id" serial PRIMARY KEY NOT NULL,
	"tax_year" integer NOT NULL,
	"form_type" text NOT NULL,
	"payer_partner_id" integer NOT NULL,
	"recipient_vendor_id" integer NOT NULL,
	"total_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"filing_method" text DEFAULT 'manual' NOT NULL,
	"corrected_status" text DEFAULT 'none' NOT NULL,
	"original_payee_snapshot" jsonb,
	"external_reference" text,
	"filed_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"delivery_channel" text,
	"notes" text,
	"sendgrid_message_id" text,
	"last_event_type" text,
	"last_event_at" timestamp with time zone,
	"bounce_reason" text,
	"opened_at" timestamp with time zone,
	"updated_by_user_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "tax_1099_correction_audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"filing_id" integer,
	"tax_year" integer NOT NULL,
	"form_type" text NOT NULL,
	"payer_partner_id" integer NOT NULL,
	"recipient_vendor_id" integer NOT NULL,
	"from_status" text NOT NULL,
	"to_status" text NOT NULL,
	"actor_user_id" integer,
	"actor_role" text NOT NULL,
	"actor_ip" text,
	"actor_user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "signup_assistant_counters" (
	"id" serial PRIMARY KEY NOT NULL,
	"namespace" text NOT NULL,
	"key" text NOT NULL,
	"count" integer NOT NULL,
	"reset_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "accounting_connection_items" ADD CONSTRAINT "accounting_connection_items_connection_id_accounting_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."accounting_connections"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "accounting_connection_reminder_log" ADD CONSTRAINT "accounting_connection_reminder_log_connection_id_accounting_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."accounting_connections"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "accounting_connections" ADD CONSTRAINT "accounting_connections_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "accounting_connections" ADD CONSTRAINT "accounting_connections_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "accounting_pushed_invoices" ADD CONSTRAINT "accounting_pushed_invoices_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "ap_payment_digest_log" ADD CONSTRAINT "ap_payment_digest_log_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "assistant_conversations" ADD CONSTRAINT "assistant_conversations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "assistant_messages" ADD CONSTRAINT "assistant_messages_conversation_id_assistant_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."assistant_conversations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "certification_reminder_log" ADD CONSTRAINT "certification_reminder_log_certification_id_employee_certifications_id_fk" FOREIGN KEY ("certification_id") REFERENCES "public"."employee_certifications"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "comment_read_receipts" ADD CONSTRAINT "comment_read_receipts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "dashboard_1099_delivery_jobs" ADD CONSTRAINT "dashboard_1099_delivery_jobs_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "dashboard_1099_delivery_jobs" ADD CONSTRAINT "dashboard_1099_delivery_jobs_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "dashboard_1099_email_log" ADD CONSTRAINT "dashboard_1099_email_log_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "dashboard_1099_email_settings" ADD CONSTRAINT "dashboard_1099_email_settings_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "dashboard_1099_email_settings" ADD CONSTRAINT "dashboard_1099_email_settings_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "direct_assignments" ADD CONSTRAINT "direct_assignments_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "direct_assignments" ADD CONSTRAINT "direct_assignments_site_location_id_site_locations_id_fk" FOREIGN KEY ("site_location_id") REFERENCES "public"."site_locations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "direct_assignments" ADD CONSTRAINT "direct_assignments_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "direct_assignments" ADD CONSTRAINT "direct_assignments_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "direct_assignments" ADD CONSTRAINT "direct_assignments_responded_by_user_id_users_id_fk" FOREIGN KEY ("responded_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "employee_certifications" ADD CONSTRAINT "employee_certifications_employee_id_vendor_people_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."vendor_people"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "field_employee_notes" ADD CONSTRAINT "field_employee_notes_employee_id_vendor_people_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."vendor_people"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "field_push_tokens" ADD CONSTRAINT "field_push_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "fire_transmitter_settings" ADD CONSTRAINT "fire_transmitter_settings_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "fire_transmitter_settings_audit_log" ADD CONSTRAINT "fire_transmitter_settings_audit_log_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "gps_logs" ADD CONSTRAINT "gps_logs_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "hotlist_bids" ADD CONSTRAINT "hotlist_bids_job_id_hotlist_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."hotlist_jobs"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "hotlist_bids" ADD CONSTRAINT "hotlist_bids_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "hotlist_comments" ADD CONSTRAINT "hotlist_comments_job_id_hotlist_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."hotlist_jobs"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "hotlist_comments" ADD CONSTRAINT "hotlist_comments_deleted_by_id_users_id_fk" FOREIGN KEY ("deleted_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "hotlist_comments" ADD CONSTRAINT "hotlist_comments_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "hotlist_jobs" ADD CONSTRAINT "hotlist_jobs_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "onboarding_progress" ADD CONSTRAINT "onboarding_progress_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "onboarding_progress" ADD CONSTRAINT "onboarding_progress_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "onboarding_progress" ADD CONSTRAINT "onboarding_progress_vendor_people_id_vendor_people_id_fk" FOREIGN KEY ("vendor_people_id") REFERENCES "public"."vendor_people"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "platform_settings_audit_log" ADD CONSTRAINT "platform_settings_audit_log_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "partner_contacts" ADD CONSTRAINT "partner_contacts_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "partner_contacts" ADD CONSTRAINT "partner_contacts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "partner_notes" ADD CONSTRAINT "partner_notes_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "vendor_people" ADD CONSTRAINT "vendor_people_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "vendor_people" ADD CONSTRAINT "vendor_people_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "vendor_notes" ADD CONSTRAINT "vendor_notes_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "vendor_work_types" ADD CONSTRAINT "vendor_work_types_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "vendor_work_types" ADD CONSTRAINT "vendor_work_types_work_type_id_work_types_id_fk" FOREIGN KEY ("work_type_id") REFERENCES "public"."work_types"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "vendor_catalog_versions" ADD CONSTRAINT "vendor_catalog_versions_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "vendor_catalog_versions" ADD CONSTRAINT "vendor_catalog_versions_published_by_user_id_users_id_fk" FOREIGN KEY ("published_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "partner_eula_acceptances" ADD CONSTRAINT "partner_eula_acceptances_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "partner_eula_acceptances" ADD CONSTRAINT "partner_eula_acceptances_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "partner_eula_acceptances" ADD CONSTRAINT "partner_eula_acceptances_vendor_catalog_version_id_vendor_catalog_versions_id_fk" FOREIGN KEY ("vendor_catalog_version_id") REFERENCES "public"."vendor_catalog_versions"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "partner_eula_acceptances" ADD CONSTRAINT "partner_eula_acceptances_accepted_by_user_id_users_id_fk" FOREIGN KEY ("accepted_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "partner_vendor_approval_events" ADD CONSTRAINT "partner_vendor_approval_events_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "partner_vendor_approval_events" ADD CONSTRAINT "partner_vendor_approval_events_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "partner_vendor_approval_events" ADD CONSTRAINT "partner_vendor_approval_events_vendor_catalog_version_id_vendor_catalog_versions_id_fk" FOREIGN KEY ("vendor_catalog_version_id") REFERENCES "public"."vendor_catalog_versions"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "partner_vendor_approval_events" ADD CONSTRAINT "partner_vendor_approval_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "work_type_site_locations" ADD CONSTRAINT "work_type_site_locations_work_type_id_work_types_id_fk" FOREIGN KEY ("work_type_id") REFERENCES "public"."work_types"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "work_type_site_locations" ADD CONSTRAINT "work_type_site_locations_site_location_id_site_locations_id_fk" FOREIGN KEY ("site_location_id") REFERENCES "public"."site_locations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "partner_work_type_afes" ADD CONSTRAINT "partner_work_type_afes_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "partner_work_type_afes" ADD CONSTRAINT "partner_work_type_afes_work_type_id_work_types_id_fk" FOREIGN KEY ("work_type_id") REFERENCES "public"."work_types"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "partner_vendor_work_type_approvals" ADD CONSTRAINT "partner_vendor_work_type_approvals_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "partner_vendor_work_type_approvals" ADD CONSTRAINT "partner_vendor_work_type_approvals_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "partner_vendor_work_type_approvals" ADD CONSTRAINT "partner_vendor_work_type_approvals_work_type_id_work_types_id_fk" FOREIGN KEY ("work_type_id") REFERENCES "public"."work_types"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "partner_vendor_work_type_approvals" ADD CONSTRAINT "partner_vendor_work_type_approvals_approved_by_user_id_users_id_fk" FOREIGN KEY ("approved_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "partner_vendor_relationships" ADD CONSTRAINT "partner_vendor_relationships_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "partner_vendor_relationships" ADD CONSTRAINT "partner_vendor_relationships_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "partner_vendor_relationships" ADD CONSTRAINT "partner_vendor_relationships_approved_by_user_id_users_id_fk" FOREIGN KEY ("approved_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "vendor_site_location_afes" ADD CONSTRAINT "vendor_site_location_afes_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "vendor_site_location_afes" ADD CONSTRAINT "vendor_site_location_afes_site_location_id_site_locations_id_fk" FOREIGN KEY ("site_location_id") REFERENCES "public"."site_locations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "site_locations" ADD CONSTRAINT "site_locations_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "site_work_assignments" ADD CONSTRAINT "site_work_assignments_site_location_id_site_locations_id_fk" FOREIGN KEY ("site_location_id") REFERENCES "public"."site_locations"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "site_work_assignments" ADD CONSTRAINT "site_work_assignments_work_type_id_work_types_id_fk" FOREIGN KEY ("work_type_id") REFERENCES "public"."work_types"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "site_work_assignments" ADD CONSTRAINT "site_work_assignments_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_site_location_id_site_locations_id_fk" FOREIGN KEY ("site_location_id") REFERENCES "public"."site_locations"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_field_employee_id_vendor_people_id_fk" FOREIGN KEY ("field_employee_id") REFERENCES "public"."vendor_people"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_work_type_id_work_types_id_fk" FOREIGN KEY ("work_type_id") REFERENCES "public"."work_types"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "ticket_check_ins" ADD CONSTRAINT "ticket_check_ins_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "ticket_check_ins" ADD CONSTRAINT "ticket_check_ins_employee_id_vendor_people_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."vendor_people"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "ticket_crew" ADD CONSTRAINT "ticket_crew_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "ticket_crew" ADD CONSTRAINT "ticket_crew_employee_id_vendor_people_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."vendor_people"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "ticket_crew" ADD CONSTRAINT "ticket_crew_added_by_user_id_users_id_fk" FOREIGN KEY ("added_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "ticket_crew" ADD CONSTRAINT "ticket_crew_removed_by_user_id_users_id_fk" FOREIGN KEY ("removed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "ticket_scheduled_notifications" ADD CONSTRAINT "ticket_scheduled_notifications_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "ticket_scheduled_notifications" ADD CONSTRAINT "ticket_scheduled_notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "ticket_assignment_rates" ADD CONSTRAINT "ticket_assignment_rates_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "ticket_assignment_rates" ADD CONSTRAINT "ticket_assignment_rates_employee_id_vendor_people_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."vendor_people"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "ticket_note_logs" ADD CONSTRAINT "ticket_note_logs_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "ticket_note_logs" ADD CONSTRAINT "ticket_note_logs_deleted_by_id_users_id_fk" FOREIGN KEY ("deleted_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "ticket_note_logs" ADD CONSTRAINT "ticket_note_logs_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "ticket_unlocks" ADD CONSTRAINT "ticket_unlocks_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "ticket_unlocks" ADD CONSTRAINT "ticket_unlocks_unlocked_by_id_users_id_fk" FOREIGN KEY ("unlocked_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "ticket_status_history" ADD CONSTRAINT "ticket_status_history_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "ticket_status_history" ADD CONSTRAINT "ticket_status_history_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "users" ADD CONSTRAINT "users_active_membership_id_user_org_memberships_id_fk" FOREIGN KEY ("active_membership_id") REFERENCES "public"."user_org_memberships"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "users" ADD CONSTRAINT "users_suspended_by_users_id_fk" FOREIGN KEY ("suspended_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "user_org_memberships" ADD CONSTRAINT "user_org_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "user_org_memberships" ADD CONSTRAINT "user_org_memberships_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "user_org_memberships" ADD CONSTRAINT "user_org_memberships_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "user_org_memberships" ADD CONSTRAINT "user_org_memberships_vendor_people_id_vendor_people_id_fk" FOREIGN KEY ("vendor_people_id") REFERENCES "public"."vendor_people"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "ticket_line_items" ADD CONSTRAINT "ticket_line_items_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "vendor_ratings" ADD CONSTRAINT "vendor_ratings_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "vendor_ratings" ADD CONSTRAINT "vendor_ratings_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "vendor_ratings" ADD CONSTRAINT "vendor_ratings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "vendor_ratings" ADD CONSTRAINT "vendor_ratings_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "location_consents" ADD CONSTRAINT "location_consents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "site_visits" ADD CONSTRAINT "site_visits_site_location_id_site_locations_id_fk" FOREIGN KEY ("site_location_id") REFERENCES "public"."site_locations"("id") ON DELETE no action ON UPDATE no action;