CREATE TABLE IF NOT EXISTS "assistant_action_audit" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer REFERENCES "users"("id") ON DELETE set null,
  "actor_role" text,
  "actor_membership_role" text,
  "partner_id" integer,
  "vendor_id" integer,
  "vendor_people_id" integer,
  "client_surface" text NOT NULL,
  "input_mode" text NOT NULL,
  "provider" text NOT NULL,
  "conversation_id" integer REFERENCES "assistant_conversations"("id") ON DELETE set null,
  "assistant_message_id" integer REFERENCES "assistant_messages"("id") ON DELETE set null,
  "tool_name" text NOT NULL,
  "action_type" text NOT NULL,
  "target_type" text,
  "target_id" text,
  "transcript_text" text,
  "parsed_intent" jsonb,
  "tool_input" jsonb,
  "tool_output" jsonb,
  "confidence" real,
  "confirmation_phrase" text,
  "gps_latitude" real,
  "gps_longitude" real,
  "gps_accuracy_meters" real,
  "result_status" text NOT NULL,
  "error_code" text,
  "error_message" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "assistant_action_audit_user_idx"
  ON "assistant_action_audit" ("user_id", "created_at");

CREATE INDEX IF NOT EXISTS "assistant_action_audit_tool_idx"
  ON "assistant_action_audit" ("tool_name", "created_at");

CREATE INDEX IF NOT EXISTS "assistant_action_audit_target_idx"
  ON "assistant_action_audit" ("target_type", "target_id", "created_at");
