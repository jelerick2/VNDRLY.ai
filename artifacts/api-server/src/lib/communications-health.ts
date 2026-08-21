export type CommunicationsHealthStatus = "ready" | "attention";
export type CommunicationsHealthSeverity = "critical" | "warning" | "info";

export type CommunicationsHealthCheck = {
  key: string;
  label: string;
  ok: boolean;
  severity: CommunicationsHealthSeverity;
  detail: string;
};

export type CommunicationsServiceHealth = {
  status: CommunicationsHealthStatus;
  configured: boolean;
  checks: CommunicationsHealthCheck[];
};

export type CommunicationsHealth = {
  generatedAt: string;
  overallStatus: CommunicationsHealthStatus;
  services: {
    sendgrid: CommunicationsServiceHealth & {
      sandboxMode: boolean;
    };
    twilio: CommunicationsServiceHealth & {
      senderMode: "messaging_service" | "phone_number" | "missing";
    };
    expoPush: CommunicationsServiceHealth;
  };
  features: {
    passwordResetEmail: { ready: boolean; provider: "sendgrid" };
    transactionalSms: { ready: boolean; provider: "twilio" };
    pushNotifications: { ready: boolean; provider: "expo" };
  };
};

type EnvLike = Record<string, string | undefined>;

function value(env: EnvLike, key: string): string {
  return env[key]?.trim() ?? "";
}

function envPresent(env: EnvLike, key: string): boolean {
  return value(env, key).length > 0;
}

function sandboxEnabled(env: EnvLike): boolean {
  const raw = value(env, "SENDGRID_SANDBOX_MODE").toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
}

function isE164Phone(value: string): boolean {
  return /^\+[1-9]\d{1,14}$/.test(value);
}

function statusFor(checks: CommunicationsHealthCheck[]): CommunicationsHealthStatus {
  return checks.every((check) => check.ok) ? "ready" : "attention";
}

export function buildCommunicationsHealth(
  env: EnvLike = process.env,
  now: Date = new Date(),
): CommunicationsHealth {
  const sendgridSandbox = sandboxEnabled(env);
  const sendgridChecks: CommunicationsHealthCheck[] = [
    {
      key: "apiKey",
      label: "SendGrid API key",
      ok: envPresent(env, "SENDGRID_API_KEY"),
      severity: "critical",
      detail: "Required for password reset and outbound email delivery.",
    },
    {
      key: "fromEmail",
      label: "Verified from email",
      ok: envPresent(env, "SENDGRID_FROM_EMAIL"),
      severity: "critical",
      detail: "Must be a verified sender or authenticated domain address.",
    },
    {
      key: "fromName",
      label: "From name",
      ok: envPresent(env, "SENDGRID_FROM_NAME"),
      severity: "info",
      detail: "Defaults to VNDRLY when unset.",
    },
    {
      key: "replyTo",
      label: "Reply-to address",
      ok: envPresent(env, "SENDGRID_REPLY_TO"),
      severity: "info",
      detail: "Recommended so recipients have a real support address.",
    },
    {
      key: "sandboxMode",
      label: "Production send mode",
      ok: !sendgridSandbox,
      severity: "warning",
      detail: sendgridSandbox
        ? "SENDGRID_SANDBOX_MODE is enabled, so SendGrid accepts messages without delivering them."
        : "Sandbox mode is off.",
    },
  ];

  const twilioMessagingService = envPresent(env, "TWILIO_MESSAGING_SERVICE_SID");
  const twilioPhone = value(env, "TWILIO_PHONE_NUMBER");
  const twilioPhoneReady = twilioPhone ? isE164Phone(twilioPhone) : false;
  const twilioSenderReady = twilioMessagingService || twilioPhoneReady;
  const twilioChecks: CommunicationsHealthCheck[] = [
    {
      key: "accountSid",
      label: "Twilio account SID",
      ok: envPresent(env, "TWILIO_ACCOUNT_SID"),
      severity: "critical",
      detail: "Required to call Twilio Messaging APIs.",
    },
    {
      key: "apiKey",
      label: "Twilio API key",
      ok: envPresent(env, "TWILIO_API_KEY"),
      severity: "critical",
      detail: "Use an API key/secret pair rather than a broad auth token.",
    },
    {
      key: "apiSecret",
      label: "Twilio API secret",
      ok: envPresent(env, "TWILIO_API_SECRET"),
      severity: "critical",
      detail: "Required with the Twilio API key.",
    },
    {
      key: "sender",
      label: "SMS sender",
      ok: twilioSenderReady,
      severity: "critical",
      detail: twilioMessagingService
        ? "Using a Twilio Messaging Service sender."
        : twilioPhone
          ? "Phone-number sender must be in E.164 format and SMS-capable."
          : "Set TWILIO_MESSAGING_SERVICE_SID or TWILIO_PHONE_NUMBER.",
    },
  ];

  const expoChecks: CommunicationsHealthCheck[] = [
    {
      key: "endpoint",
      label: "Expo push endpoint",
      ok: true,
      severity: "info",
      detail: "Expo push does not require a server secret; delivery depends on stored device tokens.",
    },
  ];

  const sendgridStatus = statusFor(
    sendgridChecks.filter((check) => check.severity !== "info"),
  );
  const twilioStatus = statusFor(twilioChecks);
  const expoStatus = statusFor(expoChecks);
  const sendgridConfigured =
    envPresent(env, "SENDGRID_API_KEY") &&
    envPresent(env, "SENDGRID_FROM_EMAIL") &&
    !sendgridSandbox;
  const twilioConfigured =
    envPresent(env, "TWILIO_ACCOUNT_SID") &&
    envPresent(env, "TWILIO_API_KEY") &&
    envPresent(env, "TWILIO_API_SECRET") &&
    twilioSenderReady;
  const overallStatus =
    sendgridStatus === "ready" && twilioStatus === "ready" && expoStatus === "ready"
      ? "ready"
      : "attention";

  return {
    generatedAt: now.toISOString(),
    overallStatus,
    services: {
      sendgrid: {
        status: sendgridStatus,
        configured: sendgridConfigured,
        sandboxMode: sendgridSandbox,
        checks: sendgridChecks,
      },
      twilio: {
        status: twilioStatus,
        configured: twilioConfigured,
        senderMode: twilioMessagingService
          ? "messaging_service"
          : twilioPhoneReady
            ? "phone_number"
            : "missing",
        checks: twilioChecks,
      },
      expoPush: {
        status: expoStatus,
        configured: true,
        checks: expoChecks,
      },
    },
    features: {
      passwordResetEmail: { ready: sendgridConfigured, provider: "sendgrid" },
      transactionalSms: { ready: twilioConfigured, provider: "twilio" },
      pushNotifications: { ready: true, provider: "expo" },
    },
  };
}
