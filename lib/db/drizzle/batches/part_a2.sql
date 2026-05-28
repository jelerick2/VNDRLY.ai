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