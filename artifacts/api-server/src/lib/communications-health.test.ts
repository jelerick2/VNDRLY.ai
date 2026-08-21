import { describe, expect, it } from "vitest";
import { buildCommunicationsHealth } from "./communications-health";

describe("buildCommunicationsHealth", () => {
  it("marks SendGrid, Twilio, password reset, and push ready when production env is complete", () => {
    const out = buildCommunicationsHealth({
      SENDGRID_API_KEY: "SG.test",
      SENDGRID_FROM_EMAIL: "support@vndrly.ai",
      SENDGRID_FROM_NAME: "VNDRLY",
      SENDGRID_REPLY_TO: "support@vndrly.ai",
      SENDGRID_SANDBOX_MODE: "false",
      SENDGRID_DOMAIN_AUTHENTICATED: "true",
      TWILIO_ACCOUNT_SID: "AC123",
      TWILIO_API_KEY: "SK123",
      TWILIO_API_SECRET: "super-private-token",
      TWILIO_MESSAGING_SERVICE_SID: "MG123",
      TWILIO_PHONE_NUMBER: "+15551234567",
      TWILIO_SENDER_REGISTRATION_STATUS: "approved",
    });

    expect(out.overallStatus).toBe("ready");
    expect(out.services.sendgrid.status).toBe("ready");
    expect(out.services.twilio.status).toBe("ready");
    expect(out.services.expoPush.status).toBe("ready");
    expect(out.features.passwordResetEmail.ready).toBe(true);
    expect(out.features.transactionalSms.ready).toBe(true);
    expect(out.services.sendgrid.sandboxMode).toBe(false);
    expect(out.services.sendgrid.domainAuthenticated).toBe(true);
    expect(out.services.twilio.registrationStatus).toBe("approved");
    expect(JSON.stringify(out)).not.toContain("super-private-token");
    expect(JSON.stringify(out)).not.toContain("+15551234567");
  });

  it("flags SendGrid sandbox mode as production attention", () => {
    const out = buildCommunicationsHealth({
      SENDGRID_API_KEY: "SG.test",
      SENDGRID_FROM_EMAIL: "support@vndrly.ai",
      SENDGRID_SANDBOX_MODE: "true",
      SENDGRID_DOMAIN_AUTHENTICATED: "true",
      TWILIO_ACCOUNT_SID: "AC123",
      TWILIO_API_KEY: "SK123",
      TWILIO_API_SECRET: "secret",
      TWILIO_PHONE_NUMBER: "+15551234567",
      TWILIO_A2P_STATUS: "approved",
    });

    expect(out.overallStatus).toBe("attention");
    expect(out.services.sendgrid.status).toBe("attention");
    expect(out.services.sendgrid.checks).toContainEqual(
      expect.objectContaining({
        key: "sandboxMode",
        ok: false,
        severity: "warning",
      }),
    );
  });

  it("reports missing required provider pieces without leaking placeholders", () => {
    const out = buildCommunicationsHealth({
      SENDGRID_API_KEY: "",
      TWILIO_ACCOUNT_SID: "AC123",
      TWILIO_API_KEY: "SK123",
      TWILIO_API_SECRET: "",
      TWILIO_PHONE_NUMBER: "555-1234",
    });

    expect(out.overallStatus).toBe("attention");
    expect(out.services.sendgrid.configured).toBe(false);
    expect(out.services.twilio.configured).toBe(false);
    expect(out.features.passwordResetEmail.ready).toBe(false);
    expect(out.features.transactionalSms.ready).toBe(false);
    expect(out.services.twilio.checks).toContainEqual(
      expect.objectContaining({
        key: "sender",
        ok: false,
        severity: "critical",
      }),
    );
    expect(out.services.twilio.checks).toContainEqual(
      expect.objectContaining({
        key: "senderRegistration",
        ok: false,
        severity: "warning",
      }),
    );
    expect(JSON.stringify(out)).not.toContain("555-1234");
  });
});
