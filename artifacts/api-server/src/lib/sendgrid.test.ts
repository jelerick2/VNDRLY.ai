import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  sendAdminResetPasswordEmail,
  sendEmailVerificationEmail,
  sendPasswordResetEmail,
} from "./sendgrid";

const originalEnv = { ...process.env };

beforeEach(() => {
  process.env.SENDGRID_API_KEY = "SG.test-key";
  process.env.SENDGRID_FROM_EMAIL = "support@vndrly.ai";
  process.env.SENDGRID_FROM_NAME = "VNDRLY";
  process.env.SENDGRID_SANDBOX_MODE = "true";
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      new Response("", {
        status: 200,
        headers: { "x-message-id": "msg-123" },
      }),
    ),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  process.env = { ...originalEnv };
});

describe("sendPasswordResetEmail", () => {
  it("sends password reset email through SendGrid", async () => {
    const result = await sendPasswordResetEmail(
      "user@example.com",
      "https://vndrly.ai/reset-password?token=abc",
      "Jane User",
    );

    expect(result).toEqual({ messageId: "msg-123" });
    const fetchMock = vi.mocked(fetch);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.sendgrid.com/v3/mail/send");
    expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer SG.test-key");
    const payload = JSON.parse(String(init?.body));
    expect(payload.from).toEqual({ email: "support@vndrly.ai", name: "VNDRLY" });
    expect(payload.personalizations[0].to).toEqual([{ email: "user@example.com" }]);
    expect(payload.subject).toBe("Reset your VNDRLY password");
    expect(payload.mail_settings.sandbox_mode.enable).toBe(true);
  });

  it("throws when SendGrid is not configured", async () => {
    delete process.env.SENDGRID_API_KEY;

    await expect(
      sendPasswordResetEmail("user@example.com", "https://vndrly.ai/reset-password?token=abc", "Jane User"),
    ).rejects.toThrow("SendGrid is not configured");
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("sendEmailVerificationEmail", () => {
  it("sends the onboarding confirmation link through SendGrid", async () => {
    const result = await sendEmailVerificationEmail(
      "admin@midconsolutions.com",
      "https://vndrly.ai/api/onboarding/verify-email/token-123",
      "Midcon Admin",
    );

    expect(result).toEqual({ messageId: "msg-123" });
    const fetchMock = vi.mocked(fetch);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.sendgrid.com/v3/mail/send");
    const payload = JSON.parse(String(init?.body));
    expect(payload.personalizations[0].to).toEqual([
      { email: "admin@midconsolutions.com" },
    ]);
    expect(payload.subject).toBe("Confirm your VNDRLY email");
    expect(payload.categories).toEqual(["email_verification"]);
    expect(payload.content[0].value).toContain(
      "https://vndrly.ai/api/onboarding/verify-email/token-123",
    );
    expect(payload.content[1].value).toContain("Confirm email");
  });
});

describe("sendAdminResetPasswordEmail", () => {
  it("sends an admin-issued temporary password through SendGrid", async () => {
    const result = await sendAdminResetPasswordEmail({
      to: "crew@example.com",
      displayName: "Crew Member",
      adminDisplayName: "Vendor Admin",
      tempPassword: "TempPass123!",
    });

    expect(result).toEqual({ messageId: "msg-123" });
    const fetchMock = vi.mocked(fetch);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.sendgrid.com/v3/mail/send");
    const payload = JSON.parse(String(init?.body));
    expect(payload.personalizations[0].to).toEqual([{ email: "crew@example.com" }]);
    expect(payload.subject).toBe("VNDRLY — Your password was reset");
    expect(payload.categories).toEqual(["admin_password_reset"]);
    expect(payload.content[0].value).toContain("TempPass123!");
    expect(payload.content[1].value).toContain("TempPass123!");
    expect(payload.content[1].value).toContain("Vendor Admin");
  });
});
