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
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import AdminAskVAudit from "./admin-askv-audit";

const SAMPLE_PAYLOAD = {
  limit: 50,
  status: null,
  rows: [
    {
      id: 11,
      createdAt: "2026-08-21T12:00:00.000Z",
      userId: 7,
      userDisplayName: "Rina Foreman",
      userEmail: "rina@example.com",
      actorRole: "vendor",
      actorMembershipRole: "foreman",
      partnerId: null,
      vendorId: 3,
      vendorPeopleId: null,
      clientSurface: "mobile",
      inputMode: "voice",
      provider: "openai_realtime",
      toolName: "send_ticket_note",
      actionType: "write",
      targetType: "ticket",
      targetId: "9942",
      confirmationPhrase: "send note",
      resultStatus: "success",
      errorCode: null,
      errorMessage: null,
      hasGps: true,
      hasToolInput: true,
      hasToolOutput: true,
    },
    {
      id: 12,
      createdAt: "2026-08-21T12:05:00.000Z",
      userId: 8,
      userDisplayName: "Lee Office",
      userEmail: "lee@example.com",
      actorRole: "vendor",
      actorMembershipRole: "office",
      partnerId: null,
      vendorId: 3,
      vendorPeopleId: null,
      clientSurface: "web",
      inputMode: "text",
      provider: "anthropic",
      toolName: "mark_notifications_read",
      actionType: "write",
      targetType: "notification",
      targetId: "n-1",
      confirmationPhrase: null,
      resultStatus: "failed",
      errorCode: "notifications.not_found",
      errorMessage: "Notification was not found.",
      hasGps: false,
      hasToolInput: true,
      hasToolOutput: false,
    },
  ],
};

function renderPage() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <AdminAskVAudit />
    </QueryClientProvider>,
  );
}

describe("AdminAskVAudit page", () => {
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

  it("admins see action rows, summary counts, and privacy flags", async () => {
    currentUser.value = { role: "admin" };
    renderPage();

    await waitFor(() =>
      expect(screen.getByTestId("row-askv-action-audit-11")).toBeTruthy(),
    );

    expect(screen.getByTestId("text-askv-audit-title").textContent).toContain(
      "AskV Action Audit",
    );
    expect(screen.getByTestId("metric-askv-audit-total").textContent).toContain("2");
    expect(screen.getByTestId("metric-askv-audit-failed").textContent).toContain("1");
    expect(screen.getByText("send_ticket_note")).toBeTruthy();
    expect(screen.getByText("mark_notifications_read")).toBeTruthy();
    expect(screen.getByText("Rina Foreman")).toBeTruthy();
    expect(screen.getByText("Notification was not found.")).toBeTruthy();
    expect(screen.getByTestId("badge-askv-audit-gps-11").textContent).toContain("GPS");

    const calledUrl = String(fetchSpy.mock.calls[0]?.[0] ?? "");
    expect(calledUrl).toContain("/api/assistant/action-audit");
    expect(calledUrl).toContain("limit=50");
  });

  it("refetches with a result-status filter", async () => {
    currentUser.value = { role: "admin" };
    renderPage();

    await waitFor(() =>
      expect(screen.getByTestId("select-askv-audit-status")).toBeTruthy(),
    );

    fireEvent.change(screen.getByTestId("select-askv-audit-status"), {
      target: { value: "failed" },
    });

    await waitFor(() => {
      const lastUrl = String(fetchSpy.mock.calls.at(-1)?.[0] ?? "");
      expect(lastUrl).toContain("status=failed");
    });
  });
});
