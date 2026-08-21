import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

if (typeof globalThis.ResizeObserver === "undefined") {
  class ResizeObserverPolyfill {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  (globalThis as { ResizeObserver: unknown }).ResizeObserver =
    ResizeObserverPolyfill;
}

const { currentUser } = vi.hoisted(() => ({
  currentUser: { value: null as { role: string } | null },
}));

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: currentUser.value, isLoading: false }),
}));

vi.mock("@/components/content-pane-back-link", () => ({
  default: ({ href }: { href: string }) => <a href={href}>Back</a>,
}));

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import AdminCommunicationsHealth from "./admin-communications-health";

const SAMPLE_PAYLOAD = {
  generatedAt: "2026-08-21T12:00:00.000Z",
  overallStatus: "attention",
  services: {
    sendgrid: {
      status: "attention",
      configured: false,
      sandboxMode: true,
      checks: [
        {
          key: "apiKey",
          label: "SendGrid API key",
          ok: true,
          severity: "critical",
          detail: "Required for password reset and outbound email delivery.",
        },
        {
          key: "sandboxMode",
          label: "Production send mode",
          ok: false,
          severity: "warning",
          detail: "SENDGRID_SANDBOX_MODE is enabled.",
        },
      ],
    },
    twilio: {
      status: "ready",
      configured: true,
      senderMode: "messaging_service",
      checks: [
        {
          key: "sender",
          label: "SMS sender",
          ok: true,
          severity: "critical",
          detail: "Using a Twilio Messaging Service sender.",
        },
      ],
    },
    expoPush: {
      status: "ready",
      configured: true,
      checks: [
        {
          key: "endpoint",
          label: "Expo push endpoint",
          ok: true,
          severity: "info",
          detail: "Expo push does not require a server secret.",
        },
      ],
    },
  },
  features: {
    passwordResetEmail: { ready: false, provider: "sendgrid" },
    transactionalSms: { ready: true, provider: "twilio" },
    pushNotifications: { ready: true, provider: "expo" },
  },
};

function renderPage() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <AdminCommunicationsHealth />
    </QueryClientProvider>,
  );
}

describe("AdminCommunicationsHealth page", () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchSpy = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => SAMPLE_PAYLOAD,
    }));
    (globalThis as { fetch: typeof fetch }).fetch =
      fetchSpy as unknown as typeof fetch;
  });

  afterEach(() => {
    cleanup();
    currentUser.value = null;
    vi.restoreAllMocks();
  });

  it("non-admins see the role-required short-circuit and never hit the API", () => {
    currentUser.value = { role: "vendor" };
    renderPage();

    expect(screen.getByText("Admin role required.")).toBeTruthy();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("renders provider status, feature readiness, and sandbox warnings", async () => {
    currentUser.value = { role: "admin" };
    renderPage();

    await waitFor(() =>
      expect(screen.getByTestId("card-communications-sendgrid")).toBeTruthy(),
    );

    expect(screen.getByTestId("text-communications-title").textContent).toContain(
      "Communications Health",
    );
    expect(screen.getByTestId("badge-communications-overall").textContent).toContain(
      "attention",
    );
    expect(screen.getByTestId("card-communications-twilio").textContent).toContain(
      "messaging_service",
    );
    expect(screen.getByTestId("feature-password-reset-email").textContent).toContain(
      "Needs attention",
    );
    expect(screen.getByText("Production send mode")).toBeTruthy();
    expect(screen.getByText("SENDGRID_SANDBOX_MODE is enabled.")).toBeTruthy();

    const calledUrl = String(fetchSpy.mock.calls[0]?.[0] ?? "");
    expect(calledUrl).toContain("/api/admin/communications-health");
  });
});
